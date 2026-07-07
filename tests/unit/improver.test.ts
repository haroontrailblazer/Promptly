import { describe, expect, it } from 'vitest';
import { analyzePrompt } from '../../src/analyzer';
import { improveLocally } from '../../src/improver/local';

describe('improveLocally', () => {
  it('adds role, constraints, and format scaffolding to a weak coding prompt', () => {
    const prompt = 'make website';
    const out = improveLocally(prompt, analyzePrompt(prompt));
    expect(out).toContain('Act as a senior software engineer.');
    expect(out).toContain('make website'); // original preserved verbatim
    expect(out).toContain('Constraints:');
    expect(out).toContain('Output format:');
    expect(out).toMatch(/\[.+\]/); // placeholders, never invented facts
  });

  it('numbers multi-step prompts', () => {
    const prompt = 'research Apple then compare with Microsoft then build a table';
    const out = improveLocally(prompt, analyzePrompt(prompt));
    expect(out).toContain('1. research Apple');
    expect(out).toContain('2. compare with Microsoft');
    expect(out).toContain('3. build a table');
  });

  it('leaves an already-strong prompt mostly alone', () => {
    const prompt =
      'Act as a senior software engineer. Write a REST API endpoint in TypeScript with Express that returns paginated users. Output format: a single code block. It must include unit tests and handle at least 3 error cases.';
    const out = improveLocally(prompt, analyzePrompt(prompt));
    expect(out).toContain(prompt);
    expect(out).not.toContain('Act as a senior software engineer.\n\nAct as'); // no duplicate role
  });
});
