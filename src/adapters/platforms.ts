// Platform capability profiles: what kind of AI surface the user is prompting
// (chat assistant vs. autonomous agent) and which invocation affordances the
// platform ships (slash-skills, @-mentions). Drives agent-aware analysis and
// rewriting — an agent prompt needs targets and acceptance criteria, not a
// persona.

export type PlatformKind = 'chat' | 'agent';

/** A concrete capability (skill or subagent) discovered on the platform. */
export interface CapabilityRef {
  name: string;
  description?: string;
}

export interface PlatformProfile {
  hosts: string[];
  /** Path prefix that switches the platform (e.g. claude.ai/code). */
  pathPrefix?: string;
  name: string;
  kind: PlatformKind;
  /** Slash-skills the platform ships that prompts can invoke directly. */
  commands?: string[];
  /** @-mention targets the platform understands. */
  mentions?: string[];
  /** Discovered installed skills (name + description), when the surface allows it. */
  skills?: CapabilityRef[];
  /** Discovered subagents that work can be delegated to. */
  agents?: CapabilityRef[];
}

export const PLATFORMS: PlatformProfile[] = [
  // Agent surfaces nested under chat hosts — listed first so the path wins.
  {
    hosts: ['claude.ai'],
    pathPrefix: '/code',
    name: 'Claude Code',
    kind: 'agent',
    commands: ['/plan', '/review', '/test', '/commit'],
    mentions: ['@file'],
  },
  { hosts: ['chatgpt.com'], pathPrefix: '/codex', name: 'Codex', kind: 'agent' },

  // Chat assistants.
  { hosts: ['chatgpt.com'], name: 'ChatGPT', kind: 'chat' },
  { hosts: ['claude.ai'], name: 'Claude', kind: 'chat' },
  { hosts: ['gemini.google.com'], name: 'Gemini', kind: 'chat' },
  { hosts: ['copilot.microsoft.com'], name: 'Copilot', kind: 'chat' },
  { hosts: ['grok.com'], name: 'Grok', kind: 'chat' },
  { hosts: ['perplexity.ai', 'www.perplexity.ai'], name: 'Perplexity', kind: 'chat' },
  { hosts: ['chat.deepseek.com'], name: 'DeepSeek', kind: 'chat' },
  { hosts: ['poe.com'], name: 'Poe', kind: 'chat' },
  { hosts: ['chat.mistral.ai'], name: 'Le Chat', kind: 'chat' },
  { hosts: ['notebooklm.google.com'], name: 'NotebookLM', kind: 'chat' },
  { hosts: ['aistudio.google.com'], name: 'AI Studio', kind: 'chat' },
  { hosts: ['platform.openai.com'], name: 'the Playground', kind: 'chat' },
  { hosts: ['console.anthropic.com'], name: 'Claude', kind: 'chat' },

  // Agent platforms.
  {
    hosts: ['cursor.com'],
    name: 'Cursor',
    kind: 'agent',
    mentions: ['@Files', '@Folders', '@Web', '@Docs'],
  },
  { hosts: ['replit.com'], name: 'Replit Agent', kind: 'agent' },
  { hosts: ['bolt.new'], name: 'Bolt', kind: 'agent' },
  { hosts: ['lovable.dev'], name: 'Lovable', kind: 'agent' },
  { hosts: ['v0.app', 'v0.dev'], name: 'v0', kind: 'agent' },
  { hosts: ['app.devin.ai'], name: 'Devin', kind: 'agent' },
  { hosts: ['windsurf.com'], name: 'Windsurf', kind: 'agent' },
  { hosts: ['manus.im'], name: 'Manus', kind: 'agent' },
  { hosts: ['studio.firebase.google.com'], name: 'Firebase Studio', kind: 'agent' },
];

const GENERIC: PlatformProfile = { hosts: [], name: 'this assistant', kind: 'chat' };

export function resolvePlatform(hostname: string, pathname: string): PlatformProfile {
  const matches = PLATFORMS.filter((p) =>
    p.hosts.some((h) => hostname === h || hostname.endsWith(`.${h}`)),
  );
  return (
    matches.find((p) => p.pathPrefix && pathname.startsWith(p.pathPrefix)) ??
    matches.find((p) => !p.pathPrefix) ??
    GENERIC
  );
}
