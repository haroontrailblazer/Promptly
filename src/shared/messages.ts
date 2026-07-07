export type BgRequest = { type: 'CLOUD_IMPROVE_REQUEST'; prompt: string };

export type BgResponse =
  | { type: 'CLOUD_IMPROVE_RESULT'; ok: true; improved: string }
  | { type: 'CLOUD_IMPROVE_RESULT'; ok: false; error: string };

export type TabMessage = { type: 'TOGGLE_CARD' };
