export function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && !el.hidden;
}

const SEND_RE = /send|submit|run|ask|go|generate/i;
const PLACEHOLDER_RE = /ask|message|prompt|chat|anything|describe|instruction/i;

function nearSendButton(el: HTMLElement): boolean {
  let node: HTMLElement | null = el;
  for (let depth = 0; node && depth < 4; depth++) {
    const buttons = node.querySelectorAll<HTMLElement>(
      'button, [role="button"], input[type="submit"]',
    );
    for (const b of buttons) {
      const name = `${b.getAttribute('aria-label') ?? ''} ${b.textContent ?? ''} ${b.getAttribute('value') ?? ''}`;
      if (SEND_RE.test(name)) return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function findPromptEditor(doc: Document): HTMLElement | null {
  const candidates = [
    ...doc.querySelectorAll<HTMLElement>('textarea, [contenteditable="true"]'),
  ].filter(isVisible);

  let best: HTMLElement | null = null;
  let bestScore = 0;
  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    let score = 0;
    if (r.width > 250) score += 2;
    if (r.top > window.innerHeight * 0.4) score += 2;
    if (nearSendButton(el)) score += 3;
    const hint = `${el.getAttribute('placeholder') ?? ''} ${el.getAttribute('aria-label') ?? ''}`;
    if (PLACEHOLDER_RE.test(hint)) score += 3;
    if (score > bestScore) {
      best = el;
      bestScore = score;
    }
  }
  return bestScore >= 3 ? best : null;
}
