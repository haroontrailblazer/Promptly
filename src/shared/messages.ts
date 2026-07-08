export type BgRequest =
  { type: 'CLOUD_IMPROVE_REQUEST'; prompt: string } | { type: 'OPEN_OPTIONS' };

export type BgResponse =
  | { type: 'CLOUD_IMPROVE_RESULT'; ok: true; improved: string }
  | { type: 'CLOUD_IMPROVE_RESULT'; ok: false; error: string };

/** Sentinel error: no AI provider is configured — caller falls back to the built-in rewriter. */
export const NO_PROVIDER = 'NO_PROVIDER';

export type TabMessage = { type: 'TOGGLE_CARD' };
