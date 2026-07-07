import { resolveAdapter } from './registry';
import { findPromptEditor, isVisible } from './heuristic';

export { resolveAdapter } from './registry';
export { findPromptEditor, isVisible } from './heuristic';
export { ALLOWED_HOSTS, ALLOWED_MATCHES } from './hosts';

export function findEditor(doc: Document, hostname: string): HTMLElement | null {
  const adapter = resolveAdapter(hostname);
  if (adapter) {
    for (const sel of adapter.editorSelector.split(',')) {
      const el = doc.querySelector<HTMLElement>(sel.trim());
      if (el && isVisible(el)) return el;
    }
  }
  return findPromptEditor(doc);
}
