import { describe, expect, it } from 'vitest';
import { analyzePrompt } from '../../src/analyzer';
import { improveSmart } from '../../src/improver/smart';

describe('improveSmart', () => {
  it('strips conversational filler before scaffolding', async () => {
    const prompt = 'can you please make website';
    const out = await improveSmart(prompt, analyzePrompt(prompt));
    expect(out).toContain('Build website');
    expect(out.toLowerCase()).not.toContain('please');
    expect(out.toLowerCase()).not.toContain('can you');
  });

  it('strips greetings and want-phrases', async () => {
    const prompt = 'hey, i want you to fix my code';
    const out = await improveSmart(prompt, analyzePrompt(prompt));
    expect(out.toLowerCase()).not.toContain('hey');
    expect(out.toLowerCase()).not.toContain('i want you to');
  });

  it('leaves strong prompts untouched', async () => {
    const prompt =
      'Act as a senior software engineer. Write a REST API endpoint in TypeScript with Express that returns paginated users. Output format: a single code block. It must include unit tests and handle at least 3 error cases.';
    const out = await improveSmart(prompt, analyzePrompt(prompt));
    expect(out).toContain(prompt);
  });
});
