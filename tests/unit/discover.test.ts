import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverClaudeCapabilities } from '../../src/cli/discover';

function scaffold(): { cwd: string; home: string } {
  const root = mkdtempSync(join(tmpdir(), 'promptly-discover-'));
  const cwd = join(root, 'project');
  const home = join(root, 'home');

  const skillDir = join(cwd, '.claude', 'skills', 'frontend-design');
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, 'SKILL.md'),
    '---\nname: frontend-design\ndescription: Design elegant web pages and UI components\n---\nBody.',
  );

  const agentsDir = join(home, '.claude', 'agents');
  mkdirSync(agentsDir, { recursive: true });
  writeFileSync(
    join(agentsDir, 'explore.md'),
    '---\nname: Explore\ndescription: Read-only fan-out codebase search\n---\nBody.',
  );

  const pluginSkills = join(
    home,
    '.claude',
    'plugins',
    'cache',
    'market',
    'toolkit',
    '1.0.0',
    'skills',
    'dataviz',
  );
  mkdirSync(pluginSkills, { recursive: true });
  writeFileSync(
    join(pluginSkills, 'SKILL.md'),
    '---\nname: dataviz\ndescription: Build charts and dashboards\n---\nBody.',
  );

  return { cwd, home };
}

describe('discoverClaudeCapabilities', () => {
  it('finds project skills, home agents, and marketplace plugin skills', () => {
    const { cwd, home } = scaffold();
    const caps = discoverClaudeCapabilities(cwd, home);
    expect(caps.skills.map((s) => s.name)).toEqual(
      expect.arrayContaining(['frontend-design', 'dataviz']),
    );
    expect(caps.skills.find((s) => s.name === 'frontend-design')?.description).toContain(
      'elegant web pages',
    );
    expect(caps.agents.map((a) => a.name)).toContain('Explore');
  });

  it('returns empty capability lists when nothing is installed', () => {
    const root = mkdtempSync(join(tmpdir(), 'promptly-empty-'));
    const caps = discoverClaudeCapabilities(join(root, 'p'), join(root, 'h'));
    expect(caps.skills).toEqual([]);
    expect(caps.agents).toEqual([]);
  });
});
