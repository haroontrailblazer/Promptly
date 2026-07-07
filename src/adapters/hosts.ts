// Chat models + agent platforms from the PRD. OpenAI Codex lives under
// chatgpt.com and Claude Code Web under claude.ai, so those entries cover them.
export const ALLOWED_HOSTS = [
  'chatgpt.com',
  'claude.ai',
  'gemini.google.com',
  'copilot.microsoft.com',
  'grok.com',
  'perplexity.ai',
  'www.perplexity.ai',
  'chat.deepseek.com',
  'poe.com',
  'chat.mistral.ai',
  'notebooklm.google.com',
  'manus.im',
  'lovable.dev',
  'bolt.new',
  'v0.app',
  'v0.dev',
  'replit.com',
  'cursor.com',
  'app.devin.ai',
  'windsurf.com',
  'studio.firebase.google.com',
  'aistudio.google.com',
  'platform.openai.com',
  'console.anthropic.com',
] as const;

export const ALLOWED_MATCHES: string[] = ALLOWED_HOSTS.map((h) => `https://${h}/*`);
