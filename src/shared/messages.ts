import type { LibraryPrompt } from './types';

export type BgRequest =
  | { type: 'CLOUD_IMPROVE_REQUEST'; prompt: string; instruction?: string }
  | { type: 'OPEN_OPTIONS' }
  | { type: 'AUTH_STATUS' }
  | { type: 'AUTH_SIGNIN'; email: string; password: string }
  | { type: 'AUTH_SIGNUP'; email: string; password: string }
  | { type: 'AUTH_SIGNOUT' }
  | { type: 'LIB_LIST' }
  | { type: 'LIB_SAVE'; title: string; text: string }
  | { type: 'LIB_DELETE'; id: string }
  | { type: 'PUBLIC_LIST' };

export type BgResponse =
  | { type: 'CLOUD_IMPROVE_RESULT'; ok: true; improved: string }
  | { type: 'CLOUD_IMPROVE_RESULT'; ok: false; error: string };

export type AuthResponse =
  { ok: true; email: string | null; info?: string } | { ok: false; error: string };
export type LibraryResponse = { ok: true; prompts: LibraryPrompt[] } | { ok: false; error: string };

/** Sentinel error: no AI provider is configured — caller falls back to the built-in rewriter. */
export const NO_PROVIDER = 'NO_PROVIDER';

export type TabMessage = { type: 'TOGGLE_CARD' };
