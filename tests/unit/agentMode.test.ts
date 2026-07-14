import { describe, expect, it } from 'vitest';
import { resolvePlatform, type PlatformProfile } from '../../src/adapters/platforms';
import { analyzePrompt } from '../../src/analyzer';
import { improveLocally } from '../../src/improver/local';

const CODE_AGENT: PlatformProfile = {
  hosts: ['claude.ai'],
  pathPrefix: '/code',
  name: 'Claude Code',
  kind: 'agent',
  commands: ['/plan', '/review', '/test', '/commit'],
  mentions: ['@file'],
};

describe('resolvePlatform', () => {
  it('distinguishes agent surfaces nested under chat hosts by path', () => {
    expect(resolvePlatform('claude.ai', '/code/session-1').kind).toBe('agent');
    expect(resolvePlatform('claude.ai', '/chat/abc').kind).toBe('chat');
    expect(resolvePlatform('chatgpt.com', '/codex').kind).toBe('agent');
    expect(resolvePlatform('chatgpt.com', '/').kind).toBe('chat');
  });

  it('classifies agent platforms and falls back to generic chat', () => {
    expect(resolvePlatform('bolt.new', '/').kind).toBe('agent');
    expect(resolvePlatform('cursor.com', '/x').mentions).toContain('@Files');
    expect(resolvePlatform('unknown.example', '/').kind).toBe('chat');
  });
});

describe('agent-aware analysis', () => {
  it('adds agent findings on agent platforms only', () => {
    const agent = analyzePrompt('fix the login bug', CODE_AGENT);
    const ids = agent.findings.map((f) => f.checkId);
    expect(ids).toContain('agent-acceptance');
    expect(ids).toContain('agent-mentions');
    expect(ids).toContain('agent-skills');
    expect(ids).not.toContain('role-missing'); // personas are chat-only advice

    const chat = analyzePrompt('fix the login bug');
    const chatIds = chat.findings.map((f) => f.checkId);
    expect(chatIds).not.toContain('agent-acceptance');
    expect(chatIds).toContain('role-missing');
  });
});

describe('agent-aware improver', () => {
  it('reframes intent as a platform skill with targets and acceptance criteria', () => {
    const prompt = 'review my code for bugs';
    const out = improveLocally(prompt, analyzePrompt(prompt, CODE_AGENT));
    expect(out.startsWith('/review my code for bugs')).toBe(true);
    expect(out).toContain('Target: @file');
    expect(out).toContain('Acceptance criteria:');
    expect(out).not.toContain('Act as'); // agents get goals, not personas
  });

  it('keeps chat prompts on the persona-based scaffold', () => {
    const prompt = 'review my code for bugs';
    const out = improveLocally(prompt, analyzePrompt(prompt));
    expect(out).toContain('Act as');
    expect(out.startsWith('/')).toBe(false);
  });

  it('never doubles an existing slash command', () => {
    const prompt = '/review src/auth.ts for race conditions';
    const out = improveLocally(prompt, analyzePrompt(prompt, CODE_AGENT));
    expect(out.match(/\/review/g)?.length).toBe(1);
  });
});
