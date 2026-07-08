import { improveWithBestProvider } from './providers';
import { getSettings } from '../shared/storage';
import type { BgRequest, BgResponse, TabMessage } from '../shared/messages';

chrome.runtime.onInstalled.addListener(() => {
  void getSettings(); // touch storage so defaults exist
});

chrome.runtime.onMessage.addListener(
  (msg: BgRequest, _sender, sendResponse: (r: BgResponse) => void) => {
    if (msg.type === 'OPEN_OPTIONS') {
      void chrome.runtime.openOptionsPage();
      return;
    }
    if (msg.type !== 'CLOUD_IMPROVE_REQUEST') return;
    void (async () => {
      try {
        const settings = await getSettings();
        const improved = await improveWithBestProvider(msg.prompt, settings);
        sendResponse({ type: 'CLOUD_IMPROVE_RESULT', ok: true, improved });
      } catch (e) {
        sendResponse({
          type: 'CLOUD_IMPROVE_RESULT',
          ok: false,
          error: e instanceof Error ? e.message : 'AI rewrite failed',
        });
      }
    })();
    return true; // keep the message channel open for the async response
  },
);

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-card') return;
  void (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) {
      const msg: TabMessage = { type: 'TOGGLE_CARD' };
      await chrome.tabs.sendMessage(tab.id, msg).catch(() => undefined);
    }
  })();
});
