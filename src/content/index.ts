import { analyzePrompt } from '../analyzer';
import { findEditor } from '../adapters';
import { getEditorText } from './editor';
import { getSettings, onSettingsChanged } from '../shared/storage';
import { throttle } from '../shared/throttle';
import type { TabMessage } from '../shared/messages';
import type { Settings } from '../shared/types';
import { mountOverlay } from '../overlay/mount';
import { useOverlayStore } from '../overlay/store';

const DEBOUNCE_MS = 300;

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

  const analyze = () => {
    // Runs inside timer/observer callbacks, which escape main().catch() —
    // contain errors here so a Promptly failure never surfaces on the host page.
    try {
      if (!editor || !editor.isConnected) return;
      const text = getEditorText(editor).trim();
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

  const onInput = guard(() => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(analyze, DEBOUNCE_MS);
  });

  const reanchor = throttle(
    guard(() => {
      if (editor?.isConnected) useOverlayStore.getState().setAnchor(editor.getBoundingClientRect());
    }),
    100,
  );

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

  detect();
  new MutationObserver(detect).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('focusin', detect);
  window.addEventListener('scroll', reanchor, { passive: true, capture: true });
  window.addEventListener('resize', reanchor, { passive: true });

  chrome.runtime.onMessage.addListener(
    guard((msg: TabMessage) => {
      if (msg.type === 'TOGGLE_CARD') useOverlayStore.getState().toggleCard();
    }),
  );
}

// A Promptly failure must never break the host page.
main().catch(() => undefined);
