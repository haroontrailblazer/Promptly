export interface SiteAdapter {
  hosts: string[];
  editorSelector: string;
}

// Selectors prefer stable attributes (ids, data-testid, role, aria) over class
// names. These WILL drift as sites redesign – the heuristic fallback plus the
// manual flagship checklist (docs/manual-checklist.md) is the safety net.
export const ADAPTERS: SiteAdapter[] = [
  { hosts: ['chatgpt.com'], editorSelector: '#prompt-textarea' },
  { hosts: ['claude.ai'], editorSelector: 'div.ProseMirror[contenteditable="true"]' },
  {
    hosts: ['gemini.google.com'],
    editorSelector: 'rich-textarea div[contenteditable="true"], div[contenteditable="true"][role="textbox"]',
  },
  {
    hosts: ['perplexity.ai', 'www.perplexity.ai'],
    editorSelector: 'textarea[placeholder], div[contenteditable="true"][role="textbox"]',
  },
  { hosts: ['copilot.microsoft.com'], editorSelector: 'textarea#userInput, textarea' },
];

export function resolveAdapter(hostname: string): SiteAdapter | null {
  return (
    ADAPTERS.find((a) => a.hosts.some((h) => hostname === h || hostname.endsWith(`.${h}`))) ?? null
  );
}
