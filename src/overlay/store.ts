import { create } from 'zustand';
import type { AnalysisResult, Settings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';
import { NO_PROVIDER, type BgRequest, type BgResponse } from '../shared/messages';
import { improveSmart } from '../improver/smart';
import { getEditorText, setEditorText } from '../content/editor';

export type PanelTab = 'improve' | 'refine' | 'breakdown';

export interface ImproveState {
  status: 'idle' | 'ready' | 'loading' | 'error';
  text?: string;
  error?: string;
  note?: string;
}

const NO_AI_NOTE = 'Built-in rewrite. Add an API key or enable Ollama (⋯) for AI rewrites.';

interface OverlayState {
  editor: HTMLElement | null;
  settings: Settings;
  analysis: AnalysisResult | null;
  anchor: DOMRect | null;
  cardOpen: boolean;
  tab: PanelTab;
  panelPos: { x: number; y: number } | null;
  improve: ImproveState;
  setEditor: (el: HTMLElement | null) => void;
  setSettings: (s: Settings) => void;
  setAnalysis: (a: AnalysisResult | null) => void;
  setAnchor: (r: DOMRect | null) => void;
  toggleCard: () => void;
  openPanel: (tab: PanelTab) => void;
  closePanel: () => void;
  setTab: (tab: PanelTab) => void;
  setPanelPos: (pos: { x: number; y: number } | null) => void;
  startImprove: () => Promise<void>;
  refine: (instruction: string) => Promise<void>;
  acceptImprove: () => Promise<void>;
  dismissImprove: () => void;
}

// Bumped on dismiss/accept/new-improve so a late AI response can't
// resurrect a diff the user already acted on.
let improveEpoch = 0;

export const useOverlayStore = create<OverlayState>((set, get) => ({
  editor: null,
  settings: DEFAULT_SETTINGS,
  analysis: null,
  anchor: null,
  cardOpen: false,
  tab: 'improve',
  panelPos: null,
  improve: { status: 'idle' },

  setEditor: (editor) => set({ editor }),
  setSettings: (settings) => set({ settings }),
  setAnalysis: (analysis) => set({ analysis }),
  setAnchor: (anchor) => set({ anchor }),
  toggleCard: () => set((s) => ({ cardOpen: !s.cardOpen })),
  openPanel: (tab) => set({ cardOpen: true, tab }),
  closePanel: () => set({ cardOpen: false }),
  setTab: (tab) => set({ tab }),
  setPanelPos: (panelPos) => set({ panelPos }),

  startImprove: async () => {
    const { editor, analysis, settings } = get();
    if (!editor || !analysis) return;
    const epoch = ++improveEpoch;
    const prompt = getEditorText(editor);
    const local = await improveSmart(prompt, analysis);
    if (epoch !== improveEpoch) return;
    const wantsAi = settings.cloudEnabled || settings.ollamaEnabled;
    set({
      improve: wantsAi
        ? { status: 'loading', text: local }
        : { status: 'ready', text: local, note: NO_AI_NOTE },
    });
    if (!wantsAi) return;
    try {
      const req: BgRequest = { type: 'CLOUD_IMPROVE_REQUEST', prompt };
      const res = (await chrome.runtime.sendMessage(req)) as BgResponse;
      if (epoch !== improveEpoch) return;
      if (res.ok) set({ improve: { status: 'ready', text: res.improved } });
      else if (res.error === NO_PROVIDER) {
        set({ improve: { status: 'ready', text: local, note: NO_AI_NOTE } });
      } else set({ improve: { status: 'error', text: local, error: res.error } });
    } catch {
      if (epoch !== improveEpoch) return;
      set({
        improve: {
          status: 'error',
          text: local,
          error: 'AI rewrite unavailable — showing the built-in improvement.',
        },
      });
    }
  },

  refine: async (instruction) => {
    const { editor, settings } = get();
    if (!editor || !instruction.trim()) return;
    const prompt = getEditorText(editor);
    if (!prompt.trim()) return;
    if (!settings.cloudEnabled && !settings.ollamaEnabled) {
      set({
        improve: {
          status: 'error',
          error: 'Refine needs an AI provider — add an API key or enable Ollama (⋯).',
        },
      });
      return;
    }
    const epoch = ++improveEpoch;
    set({ improve: { status: 'loading' } });
    try {
      const req: BgRequest = { type: 'CLOUD_IMPROVE_REQUEST', prompt, instruction };
      const res = (await chrome.runtime.sendMessage(req)) as BgResponse;
      if (epoch !== improveEpoch) return;
      if (res.ok) set({ improve: { status: 'ready', text: res.improved } });
      else if (res.error === NO_PROVIDER) {
        set({
          improve: {
            status: 'error',
            error: 'Refine needs an AI provider — add an API key or enable Ollama (⋯).',
          },
        });
      } else set({ improve: { status: 'error', error: res.error } });
    } catch {
      if (epoch !== improveEpoch) return;
      set({ improve: { status: 'error', error: 'AI refine unavailable — try again.' } });
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
