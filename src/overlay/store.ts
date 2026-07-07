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
  acceptImprove: () => void;
  dismissImprove: () => void;
}

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
    const prompt = getEditorText(editor);
    const local = improveLocally(prompt, analysis);
    set({ improve: { status: settings.cloudEnabled ? 'loading' : 'ready', text: local } });
    if (!settings.cloudEnabled) return;
    try {
      const req: BgRequest = { type: 'CLOUD_IMPROVE_REQUEST', prompt };
      const res = (await chrome.runtime.sendMessage(req)) as BgResponse;
      if (res.ok) set({ improve: { status: 'ready', text: res.improved } });
      else set({ improve: { status: 'error', text: local, error: res.error } });
    } catch {
      set({ improve: { status: 'error', text: local, error: 'Cloud rewrite unavailable – showing local improvement.' } });
    }
  },

  acceptImprove: () => {
    const { editor, improve } = get();
    if (!editor || !improve.text) return;
    if (!setEditorText(editor, improve.text)) {
      void navigator.clipboard.writeText(improve.text).catch(() => {});
      set({
        improve: {
          ...improve,
          status: 'error',
          error: "Couldn't replace the text – improved prompt copied to clipboard. Paste to use it.",
        },
      });
      return;
    }
    set({ improve: { status: 'idle' }, cardOpen: false });
  },

  dismissImprove: () => set({ improve: { status: 'idle' } }),
}));
