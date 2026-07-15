// Promptly engine for terminals, hooks, and MCP-capable agents.
// Reuses the extension's analyzer/improver - no browser APIs anywhere here.
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { analyzePrompt } from '../analyzer';
import { improveSmart } from '../improver/smart';
import { improveLocally } from '../improver/local';
import { resolvePlatform, type PlatformProfile } from '../adapters/platforms';
import { cloudImprove } from '../background/cloud';
import { ollamaImprove, openaiImprove } from '../background/providers';
import { discoverClaudeCapabilities } from './discover';
import { DEFAULT_SETTINGS, type AnalysisResult, type Settings } from '../shared/types';

const BOM = /^\uFEFF/;

export interface EngineOptions {
  /** Optimize for an autonomous agent instead of a chat assistant. */
  agent?: boolean;
  /** Named platform profile (e.g. 'claude-code') for skill-aware rewriting. */
  platform?: string;
  /** Skip AI providers even when keys are present. */
  local?: boolean;
  /** Fully resolved profile (e.g. from claudeCodeProfile) - wins over flags. */
  profile?: PlatformProfile;
}

/**
 * Claude Code profile enriched with the skills and subagents actually
 * installed on this machine/project, so rewrites invoke real capabilities.
 */
export function claudeCodeProfile(cwd?: string): PlatformProfile {
  const base = resolvePlatform('claude.ai', '/code');
  const { skills, agents } = discoverClaudeCapabilities(cwd);
  const commands = [...skills.map((s) => `/${s.name}`), ...(base.commands ?? [])];
  return { ...base, name: 'Claude Code', skills, agents, commands: [...new Set(commands)] };
}

function profileFor(opts: EngineOptions): PlatformProfile | undefined {
  if (opts.profile) return opts.profile;
  if (opts.platform === 'claude-code') return claudeCodeProfile();
  if (opts.agent || opts.platform === 'agent') {
    return { hosts: [], name: opts.platform ?? 'your agent', kind: 'agent' };
  }
  return undefined;
}

export function analyze(text: string, opts: EngineOptions = {}): AnalysisResult {
  return analyzePrompt(text, profileFor(opts));
}

function envSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    cloudEnabled: true,
    apiKey: process.env.ANTHROPIC_API_KEY || undefined,
    openaiKey: process.env.OPENAI_API_KEY || undefined,
    ollamaEnabled: process.env.PROMPTLY_OLLAMA === '1',
    model: process.env.PROMPTLY_MODEL || DEFAULT_SETTINGS.model,
    openaiModel: process.env.PROMPTLY_OPENAI_MODEL || DEFAULT_SETTINGS.openaiModel,
  };
}

export async function improve(text: string, opts: EngineOptions = {}): Promise<string> {
  const analysis = analyze(text, opts);
  const local = await improveSmart(text, analysis);
  if (opts.local) return local;
  const s = envSettings();
  try {
    if (s.apiKey) return await cloudImprove(text, s);
    if (s.openaiKey) return await openaiImprove(text, s);
    if (s.ollamaEnabled) return await ollamaImprove(text, s);
  } catch {
    /* provider failed - the local rewrite below is always available */
  }
  return local;
}

export { improveLocally };

// ---------------------------------------------------------------- CLI ----

function readStdin(): string {
  try {
    // Strip a UTF-8 BOM - Windows shells prepend one when piping.
    return readFileSync(0, 'utf8').replace(BOM, '');
  } catch {
    return '';
  }
}

const HELP = `Promptly - Grammarly for AI prompts, in your terminal.

Usage:
  promptly score   [text] [--stdin] [--agent] [--platform claude-code] [--json]
  promptly improve [text] [--stdin] [--agent] [--platform claude-code] [--local] [--json]
  promptly clip    [--agent]         rewrite the clipboard in place (Windows)
  promptly mcp                       run as an MCP server (stdio) for any agent

AI providers (optional - falls back to the built-in rewriter):
  ANTHROPIC_API_KEY / OPENAI_API_KEY / PROMPTLY_OLLAMA=1 (local Ollama)`;

function parse(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const kv = new Map<string, string>();
  argv.forEach((a, i) => {
    if (a.startsWith('--') && argv[i + 1] && !argv[i + 1].startsWith('--')) kv.set(a, argv[i + 1]);
  });
  const words = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--platform');
  return { flags, kv, words };
}

function band(score: number): string {
  return score >= 80 ? 'Strong' : score >= 50 ? 'Okay' : 'Weak';
}

function printScore(a: AnalysisResult): void {
  console.log(`Prompt score: ${a.score.overall}/100 (${band(a.score.overall)})`);
  for (const f of a.findings) console.log(`  - ${f.message}: ${f.suggestion}`);
  if (a.findings.length === 0) console.log('  Nothing to suggest - this prompt is solid.');
}

function winClipboard(read: true): string;
function winClipboard(read: false, text?: string): string;
function winClipboard(read: boolean, text?: string): string {
  if (process.platform !== 'win32') throw new Error('clip mode is Windows-only for now');
  if (read) {
    const r = spawnSync('powershell', ['-noprofile', '-command', 'Get-Clipboard -Raw'], {
      encoding: 'utf8',
    });
    return (r.stdout ?? '').trim();
  }
  spawnSync('powershell', ['-noprofile', '-command', '$input | Set-Clipboard'], {
    input: text ?? '',
    encoding: 'utf8',
  });
  return '';
}

async function runMcp(): Promise<void> {
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { z } = await import('zod');
  const server = new McpServer({ name: 'promptly', version: '0.4.0' });

  server.tool(
    'score_prompt',
    'Score an AI prompt 0-100 (clarity, context, constraints, format, objective, ambiguity, readiness) with concrete findings.',
    { prompt: z.string(), agent: z.boolean().optional() },
    ({ prompt, agent }) => {
      const a = analyze(prompt, { agent });
      return { content: [{ type: 'text' as const, text: JSON.stringify(a, null, 2) }] };
    },
  );

  server.tool(
    'improve_prompt',
    'Rewrite an AI prompt to be clear, complete, and well structured. Set agent=true when the prompt targets an autonomous coding agent; set platform="claude-code" to reframe around installed Claude Code skills/subagents.',
    { prompt: z.string(), agent: z.boolean().optional(), platform: z.string().optional() },
    async ({ prompt, agent, platform }) => {
      const improved = await improve(prompt, { agent, platform });
      return { content: [{ type: 'text' as const, text: improved }] };
    },
  );

  await server.connect(new StdioServerTransport());
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const { flags, kv, words } = parse(rest);
  const opts: EngineOptions = {
    agent: flags.has('--agent'),
    platform: kv.get('--platform'),
    local: flags.has('--local'),
  };
  // Read stdin only when asked for or actually piped — reading a TTY would
  // block forever on an interactive `promptly improve` with no text.
  const wantStdin = flags.has('--stdin') || (words.length === 0 && !process.stdin.isTTY);
  const text = wantStdin ? readStdin().trim() : words.join(' ');

  switch (cmd) {
    case 'score': {
      if (!text) return void console.error('No prompt given. Try: promptly score "make website"');
      const a = analyze(text, opts);
      if (flags.has('--json')) console.log(JSON.stringify(a, null, 2));
      else printScore(a);
      return;
    }
    case 'improve': {
      if (!text) return void console.error('No prompt given. Try: promptly improve "make website"');
      const improved = await improve(text, opts);
      if (flags.has('--json')) {
        const a = analyze(text, opts);
        console.log(JSON.stringify({ score: a.score, improved }, null, 2));
      } else console.log(improved);
      return;
    }
    case 'clip': {
      const current = winClipboard(true);
      if (!current) return void console.error('Clipboard is empty.');
      const improved = await improve(current, opts);
      winClipboard(false, improved);
      console.log('Clipboard rewritten - paste anywhere.');
      return;
    }
    case 'mcp':
      return runMcp();
    default:
      console.log(HELP);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
