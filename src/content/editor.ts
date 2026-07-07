export function getEditorText(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement) return el.value;
  // innerText preserves visual line breaks in contenteditable editors.
  return el.innerText ?? el.textContent ?? '';
}

export function setEditorText(el: HTMLElement, text: string): boolean {
  if (el instanceof HTMLTextAreaElement) {
    // React and friends track the value property — go through the native
    // prototype setter so the framework's onChange sees the update.
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) setter.call(el, text);
    else el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return el.value === text;
  }

  // Contenteditable (ProseMirror/Lexical): select-all + insertText goes
  // through beforeinput, which rich editors honor.
  try {
    el.focus();
    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
    const ok = document.execCommand('insertText', false, text);
    return ok && getEditorText(el).trim().length > 0;
  } catch {
    return false;
  }
}
