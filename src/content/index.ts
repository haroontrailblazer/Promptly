import { analyzePrompt } from '../analyzer';
import { findEditor } from '../adapters';
import { getEditorText } from './editor';
import { getSettings, onSettingsChanged } from '../shared/storage';
import { throttle } from '../shared/throttle';
import type { TabMessage } from '../shared/messages';
import type { Settings } from '../shared/types';
import { mountOverlay } from '../overlay/mount';
import { useOverlayStore } from '../overlay/store';

const DEBOUNCE_MS = 200;

// Callbacks below run outside main()'s promise chain — contain errors so a
// Promptly failure never breaks the host page.
const guard = <T extends (...args: never[]) => void>(fn: T): T =>
  ((...args: never[]) => {
    try {
      fn(...args);
    } catch {
      /* never break the host page */
    }
  }) as T;

// The content script never talks to the network — keep the API key out of
// third-party page processes entirely.
const sanitizeSettings = (s: Settings): Settings => {
  const clean = { ...s };
  delete clean.apiKey;
  return clean;
};

async function main(): Promise<void> {
  const settings = await getSettings();
  if (!settings.enabled || settings.disabledSites.includes(location.hostname)) return;

  mountOverlay();
  const store = useOverlayStore.getState();
  store.setSettings(sanitizeSettings(settings));
  onSettingsChanged(guard((s) => useOverlayStore.getState().setSettings(sanitizeSettings(s))));

  let editor: HTMLElement | null = null;
  let debounceTimer: number | undefined;
  let lastAnalyzed = '';

  const analyze = () => {
    // Runs inside timer/observer callbacks, which escape main().catch() —
    // contain errors here so a Promptly failure never surfaces on the host page.
    try {
      if (!editor || !editor.isConnected) return;
      const text = getEditorText(editor).trim();
      lastAnalyzed = text;
      const st = useOverlayStore.getState();
      if (!text) {
        st.setAnalysis(null);
        return;
      }
      st.setAnalysis(analyzePrompt(text));
      st.setAnchor(editor.getBoundingClientRect());
    } catch {
      /* never break the host page */
    }
  };

  const onInput = guard((e: Event) => {
    window.clearTimeout(debounceTimer);
    // Pasted prompts should score immediately — only keystrokes are debounced.
    const pasted = (e as InputEvent).inputType === 'insertFromPaste';
    debounceTimer = window.setTimeout(analyze, pasted ? 0 : DEBOUNCE_MS);
  });

  // The composer moves constantly on chat sites (messages stream in above it,
  // panels open, SPAs re-layout) without scroll/resize events — track its rect
  // every frame and re-anchor only when it actually moved. rAF pauses
  // automatically in background tabs.
  const trackAnchor = () => {
    try {
      const st = useOverlayStore.getState();
      if (editor?.isConnected && st.analysis) {
        const r = editor.getBoundingClientRect();
        const a = st.anchor;
        if (
          !a ||
          a.top !== r.top ||
          a.left !== r.left ||
          a.right !== r.right ||
          a.bottom !== r.bottom
        ) {
          st.setAnchor(r);
        }
      }
    } catch {
      /* never break the host page */
    }
    window.requestAnimationFrame(trackAnchor);
  };
  window.requestAnimationFrame(trackAnchor);

  const attach = (el: HTMLElement) => {
    if (el === editor) return;
    editor?.removeEventListener('input', onInput);
    editor = el;
    useOverlayStore.getState().setEditor(el);
    el.addEventListener('input', onInput);
    analyze();
  };

  const detect = throttle(
    guard(() => {
      const el = findEditor(document, location.hostname);
      if (el) attach(el);
      else if (editor && !editor.isConnected) {
        editor.removeEventListener('input', onInput);
        editor = null;
        useOverlayStore.getState().setEditor(null);
        useOverlayStore.getState().setAnalysis(null);
      }
    }),
    1000,
  );

  // Safety net: sites clear or rewrite editors programmatically (undo, send,
  // regenerate) without firing input events — poll cheaply so the analysis
  // always tracks what is actually in the editor, including full deletion.
  window.setInterval(
    guard(() => {
      if (document.visibilityState !== 'visible' || !editor?.isConnected) return;
      if (getEditorText(editor).trim() !== lastAnalyzed) analyze();
    }),
    600,
  );

  detect();
  new MutationObserver(detect).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('focusin', detect);

  chrome.runtime.onMessage.addListener(
    guard((msg: TabMessage) => {
      if (msg.type === 'TOGGLE_CARD') useOverlayStore.getState().toggleCard();
    }),
  );
}

// A Promptly failure must never break the host page.
main().catch(() => undefined);
