import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Smoke tests against the built single-file CLI. Skipped when the bundle
// hasn't been built yet (npm run build:cli produces it).
const BIN = 'bin/promptly.mjs';
const built = existsSync(BIN);

describe.skipIf(!built)('promptly CLI', () => {
  it('errors fast on empty piped stdin, with a failing exit code', () => {
    const r = spawnSync('node', [BIN, 'improve'], { input: '', encoding: 'utf8', timeout: 15000 });
    expect(r.stderr).toContain('No prompt given');
    expect(r.status).toBe(1); // scripts must be able to detect misuse
  });

  it('scores a piped prompt', () => {
    const r = spawnSync('node', [BIN, 'score', '--stdin'], {
      input: 'make website',
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(r.stdout).toContain('Prompt score: 40/100');
  });

  it('improves an argument prompt with the agent scaffold', () => {
    const r = spawnSync('node', [BIN, 'improve', 'review my code for bugs', '--agent', '--local'], {
      encoding: 'utf8',
      timeout: 20000,
    });
    expect(r.stdout).toContain('Acceptance criteria:');
    expect(r.stdout).not.toContain('Act as');
  });
});
