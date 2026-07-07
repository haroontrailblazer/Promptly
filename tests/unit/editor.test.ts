import { describe, expect, it } from 'vitest';
import { getEditorText, setEditorText } from '../../src/content/editor';

describe('editor io', () => {
  it('reads and writes a textarea through the native setter and fires input', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    ta.value = 'old';
    let fired = 0;
    ta.addEventListener('input', () => fired++);
    expect(getEditorText(ta)).toBe('old');
    expect(setEditorText(ta, 'new text')).toBe(true);
    expect(ta.value).toBe('new text');
    expect(fired).toBe(1);
  });

  it('reads contenteditable text', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.textContent = 'hello world';
    document.body.appendChild(div);
    expect(getEditorText(div)).toBe('hello world');
  });

  it('returns false when contenteditable replacement fails', () => {
    // happy-dom has no execCommand — exactly the failure path we need to cover.
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.textContent = 'hello';
    document.body.appendChild(div);
    expect(setEditorText(div, 'replaced')).toBe(false);
  });

  it('returns false when the editor only partially applies the replacement', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.textContent = 'hello';
    document.body.appendChild(div);
    (document as unknown as { execCommand: () => boolean }).execCommand = () => {
      div.textContent = 'partial only';
      return true;
    };
    expect(setEditorText(div, 'the full replacement text')).toBe(false);
    delete (document as { execCommand?: unknown }).execCommand;
  });

  it('accepts replacements that differ only in whitespace normalization', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.textContent = 'old';
    document.body.appendChild(div);
    (document as unknown as { execCommand: () => boolean }).execCommand = () => {
      div.textContent = 'new  text ';
      return true;
    };
    expect(setEditorText(div, 'new text')).toBe(true);
    delete (document as { execCommand?: unknown }).execCommand;
  });
});
