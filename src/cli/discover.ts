// Discovers the skills and subagents actually installed for Claude Code, so
// the rewriter can reframe prompts around real capabilities ("design this
// page" → "/frontend-design design this page"). Node-only — never bundled
// into the browser extension.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { CapabilityRef } from '../adapters/platforms';

const MAX_CAPS = 200;

function parseFrontmatter(md: string): { name?: string; description?: string } {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const get = (k: string) => m[1].match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.trim();
  return { name: get('name'), description: get('description') };
}

function collectSkills(dir: string, out: CapabilityRef[]): void {
  try {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || out.length >= MAX_CAPS) continue;
      const skillMd = join(dir, entry.name, 'SKILL.md');
      if (!existsSync(skillMd)) continue;
      const fm = parseFrontmatter(readFileSync(skillMd, 'utf8'));
      out.push({ name: fm.name ?? entry.name, description: fm.description });
    }
  } catch {
    /* discovery is best-effort */
  }
}

function collectAgents(dir: string, out: CapabilityRef[]): void {
  try {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md') || out.length >= MAX_CAPS) continue;
      const fm = parseFrontmatter(readFileSync(join(dir, entry.name), 'utf8'));
      out.push({ name: fm.name ?? entry.name.replace(/\.md$/, ''), description: fm.description });
    }
  } catch {
    /* discovery is best-effort */
  }
}

export function discoverClaudeCapabilities(
  cwd: string = process.cwd(),
  home: string = homedir(),
): { skills: CapabilityRef[]; agents: CapabilityRef[] } {
  const skills: CapabilityRef[] = [];
  const agents: CapabilityRef[] = [];

  for (const root of [join(cwd, '.claude'), join(home, '.claude')]) {
    collectSkills(join(root, 'skills'), skills);
    collectAgents(join(root, 'agents'), agents);
  }

  // Marketplace plugins: ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/skills/*
  try {
    const cache = join(home, '.claude', 'plugins', 'cache');
    if (existsSync(cache)) {
      for (const marketplace of readdirSync(cache)) {
        const mDir = join(cache, marketplace);
        for (const plugin of readdirSync(mDir)) {
          const pDir = join(mDir, plugin);
          for (const version of readdirSync(pDir)) {
            collectSkills(join(pDir, version, 'skills'), skills);
            collectAgents(join(pDir, version, 'agents'), agents);
          }
        }
      }
    }
  } catch {
    /* discovery is best-effort */
  }

  // De-duplicate by name, first (most local) wins.
  const dedupe = (caps: CapabilityRef[]) => {
    const seen = new Set<string>();
    return caps.filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)));
  };
  return { skills: dedupe(skills), agents: dedupe(agents) };
}
