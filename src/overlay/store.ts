import { create } from 'zustand';
import type { AnalysisResult, Settings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';
import type { BgRequest, BgResponse } from '../shared/messages';
import { improveLocally } from '../improver/local';
import { getEditorText, setEditorText } from '../content/editor';

export interface ImproveState {
  status: 'idle' | 'ready' | 'loading' | 'error';
  text?: string;
  error?: string;
}

interface OverlayState {
  editor: HTMLElement | null;
  settings: Settings;
  analysis: AnalysisResult | null;
  anchor: DOMRect | null;
  cardOpen: boolean;
  improve: ImproveState;
  setEditor: (el: HTMLElement | null) => void;
  setSettings: (s: Settings) => void;
  setAnalysis: (a: AnalysisResult | null) => void;
  setAnchor: (r: DOMRect | null) => void;
  toggleCard: () => void;
  startImprove: () => Promise<void>;
  acceptImprove: () => Promise<void>;
  dismissImprove: () => void;
}

// Bumped on dismiss/accept/new-improve so a late cloud response can't
// resurrect a diff the user already acted on.
let improveEpoch = 0;

export const useOverlayStore = create<OverlayState>((set, get) => ({
  editor: null,
  settings: DEFAULT_SETTINGS,
  analysis: null,
  anchor: null,
  cardOpen: false,
  improve: { status: 'idle' },

  setEditor: (editor) => set({ editor }),
  setSettings: (settings) => set({ settings }),
  setAnalysis: (analysis) => set({ analysis }),
  setAnchor: (anchor) => set({ anchor }),
  toggleCard: () => set((s) => ({ cardOpen: !s.cardOpen })),

  startImprove: async () => {
    const { editor, analysis, settings } = get();
    if (!editor || !analysis) return;
    const epoch = ++improveEpoch;
    const prompt = getEditorText(editor);
    const local = improveLocally(prompt, analysis);
    set({ improve: { status: settings.cloudEnabled ? 'loading' : 'ready', text: local } });
    if (!settings.cloudEnabled) return;
    try {
      const req: BgRequest = { type: 'CLOUD_IMPROVE_REQUEST', prompt };
      const res = (await chrome.runtime.sendMessage(req)) as BgResponse;
      if (epoch !== improveEpoch) return;
      if (res.ok) set({ improve: { status: 'ready', text: res.improved } });
      else set({ improve: { status: 'error', text: local, error: res.error } });
    } catch {
      if (epoch !== improveEpoch) return;
      set({
        improve: {
          status: 'error',
          text: local,
          error: 'Cloud rewrite unavailable — showing local improvement.',
        },
      });
    }
  },

  acceptImprove: async () => {
    const { editor, improve } = get();
    if (!editor || !improve.text) return;
    improveEpoch++;
    if (!setEditorText(editor, improve.text)) {
      let copied = true;
      try {
        await navigator.clipboard.writeText(improve.text);
      } catch {
        copied = false;
      }
      const current = get().improve;
      if (current.text === undefined) return; // dismissed while copying — stay dismissed
      set({
        improve: {
          ...current,
          status: 'error',
          error: copied
            ? "Couldn't replace the text — improved prompt copied to clipboard. Paste to use it."
            : "Couldn't replace the text automatically. Copy the improved prompt manually.",
        },
      });
      return;
    }
    set({ improve: { status: 'idle' }, cardOpen: false });
  },

  dismissImprove: () => {
    improveEpoch++;
    set({ improve: { status: 'idle' } });
  },
}));
