import { beforeEach, describe, expect, it } from 'vitest';
import { findPromptEditor } from '../../src/adapters/heuristic';
import { resolveAdapter } from '../../src/adapters/registry';
import { findEditor } from '../../src/adapters';

function rect(el: HTMLElement, r: Partial<DOMRect>) {
  el.getBoundingClientRect = () =>
    ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, ...r }) as DOMRect;
}

beforeEach(() => {
  document.body.innerHTML = '';
  Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
});

describe('findPromptEditor', () => {
  it('picks a wide, low textarea next to a send button', () => {
    document.body.innerHTML = `
      <form>
        <textarea id="chat" placeholder="Message the assistant"></textarea>
        <button aria-label="Send message">Send</button>
      </form>`;
    const ta = document.getElementById('chat') as HTMLElement;
    rect(ta, { width: 600, height: 60, top: 620, bottom: 680 });
    expect(findPromptEditor(document)).toBe(ta);
  });

  it('ignores small or invisible inputs with no send affordance', () => {
    document.body.innerHTML = `<textarea id="search"></textarea>`;
    const ta = document.getElementById('search') as HTMLElement;
    rect(ta, { width: 120, height: 20, top: 40, bottom: 60 });
    expect(findPromptEditor(document)).toBeNull();
  });

  it('prefers the contenteditable with prompt-like aria-label', () => {
    document.body.innerHTML = `
      <div id="editor" contenteditable="true" aria-label="Ask anything"></div>
      <button>Send</button>`;
    const ed = document.getElementById('editor') as HTMLElement;
    rect(ed, { width: 500, height: 50, top: 600, bottom: 650 });
    expect(findPromptEditor(document)).toBe(ed);
  });
});

describe('resolveAdapter', () => {
  it('matches exact hosts and subdomains', () => {
    expect(resolveAdapter('chatgpt.com')?.editorSelector).toContain('prompt-textarea');
    expect(resolveAdapter('www.perplexity.ai')).not.toBeNull();
    expect(resolveAdapter('example.com')).toBeNull();
  });
});

describe('findEditor', () => {
  it('uses the adapter selector when it matches', () => {
    document.body.innerHTML = `<textarea id="prompt-textarea"></textarea>`;
    const ta = document.getElementById('prompt-textarea') as HTMLElement;
    rect(ta, { width: 600, height: 60, top: 620, bottom: 680 });
    expect(findEditor(document, 'chatgpt.com')).toBe(ta);
  });

  it('falls back to the heuristic when the adapter misses', () => {
    document.body.innerHTML = `
      <form>
        <textarea id="other" placeholder="Ask anything"></textarea>
        <button>Send</button>
      </form>`;
    const ta = document.getElementById('other') as HTMLElement;
    rect(ta, { width: 600, height: 60, top: 620, bottom: 680 });
    expect(findEditor(document, 'chatgpt.com')).toBe(ta);
  });
});
