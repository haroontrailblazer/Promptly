import { improveWithBestProvider } from './providers';
import { getSettings } from '../shared/storage';
import type { AuthResponse, BgRequest, LibraryResponse, TabMessage } from '../shared/messages';
import {
  authStatus,
  deletePrompt,
  listPrompts,
  listPublicPrompts,
  savePrompt,
  signIn,
  signOut,
  signUp,
} from './backend';

chrome.runtime.onInstalled.addListener(() => {
  void getSettings(); // touch storage so defaults exist
});

const errMsg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

chrome.runtime.onMessage.addListener((msg: BgRequest, _sender, sendResponse) => {
  switch (msg.type) {
    case 'OPEN_OPTIONS':
      void chrome.runtime.openOptionsPage();
      return;

    case 'CLOUD_IMPROVE_REQUEST':
      void (async () => {
        try {
          const settings = await getSettings();
          const improved = await improveWithBestProvider(msg.prompt, settings, msg.instruction);
          sendResponse({ type: 'CLOUD_IMPROVE_RESULT', ok: true, improved });
        } catch (e) {
          sendResponse({
            type: 'CLOUD_IMPROVE_RESULT',
            ok: false,
            error: errMsg(e, 'AI rewrite failed'),
          });
        }
      })();
      return true;

    case 'AUTH_STATUS':
      void (async () => {
        try {
          const email = await authStatus();
          sendResponse({ ok: true, email } satisfies AuthResponse);
        } catch (e) {
          sendResponse({ ok: false, error: errMsg(e, 'Auth check failed') } satisfies AuthResponse);
        }
      })();
      return true;

    case 'AUTH_SIGNIN':
      void (async () => {
        try {
          const email = await signIn(msg.email, msg.password);
          sendResponse({ ok: true, email } satisfies AuthResponse);
        } catch (e) {
          sendResponse({ ok: false, error: errMsg(e, 'Sign-in failed') } satisfies AuthResponse);
        }
      })();
      return true;

    case 'AUTH_SIGNUP':
      void (async () => {
        try {
          const email = await signUp(msg.email, msg.password);
          sendResponse({
            ok: true,
            email,
            info: email ? undefined : 'Check your email to confirm the account, then sign in.',
          } satisfies AuthResponse);
        } catch (e) {
          sendResponse({ ok: false, error: errMsg(e, 'Sign-up failed') } satisfies AuthResponse);
        }
      })();
      return true;

    case 'AUTH_SIGNOUT':
      void (async () => {
        try {
          await signOut();
          sendResponse({ ok: true, email: null } satisfies AuthResponse);
        } catch (e) {
          sendResponse({ ok: false, error: errMsg(e, 'Sign-out failed') } satisfies AuthResponse);
        }
      })();
      return true;

    case 'LIB_LIST':
      void (async () => {
        try {
          sendResponse({ ok: true, prompts: await listPrompts() } satisfies LibraryResponse);
        } catch (e) {
          sendResponse({
            ok: false,
            error: errMsg(e, 'Could not load your library'),
          } satisfies LibraryResponse);
        }
      })();
      return true;

    case 'LIB_SAVE':
      void (async () => {
        try {
          await savePrompt(msg.title, msg.text);
          sendResponse({ ok: true, prompts: await listPrompts() } satisfies LibraryResponse);
        } catch (e) {
          sendResponse({
            ok: false,
            error: errMsg(e, 'Could not save the prompt'),
          } satisfies LibraryResponse);
        }
      })();
      return true;

    case 'LIB_DELETE':
      void (async () => {
        try {
          await deletePrompt(msg.id);
          sendResponse({ ok: true, prompts: await listPrompts() } satisfies LibraryResponse);
        } catch (e) {
          sendResponse({
            ok: false,
            error: errMsg(e, 'Could not delete the prompt'),
          } satisfies LibraryResponse);
        }
      })();
      return true;

    case 'PUBLIC_LIST':
      void (async () => {
        try {
          sendResponse({ ok: true, prompts: await listPublicPrompts() } satisfies LibraryResponse);
        } catch (e) {
          sendResponse({
            ok: false,
            error: errMsg(e, 'Could not load public prompts'),
          } satisfies LibraryResponse);
        }
      })();
      return true;
  }
});

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
