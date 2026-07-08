import { describe, expect, it } from 'vitest';
import { analyzePrompt } from '../../src/analyzer';
import { improveLocally, extractSubject } from '../../src/improver/local';

describe('extractSubject', () => {
  it('pulls the noun phrase after the leading verb', () => {
    expect(extractSubject('make website')).toBe('website');
    expect(extractSubject('draft an email to my landlord')).toBe('email');
    expect(extractSubject('write a blog post about remote work')).toBe('blog post');
  });

  it('ignores pronoun-only subjects', () => {
    expect(extractSubject('summarize it')).toBeNull();
    expect(extractSubject('improve this')).toBeNull();
  });
});

describe('improveLocally', () => {
  it('tailors a weak web prompt: sharper verb, front-end role, web-specific hints', () => {
    const prompt = 'make website';
    const out = improveLocally(prompt, analyzePrompt(prompt));
    expect(out).toContain('Act as a senior front-end engineer.');
    expect(out).toContain('Build website'); // vague opener sharpened
    expect(out).toContain('Constraints: [tech stack');
    expect(out).toContain('Output format:');
    expect(out).toMatch(/\[.+\]/); // placeholders, never invented facts
  });

  it('gives an email prompt visibly different scaffolding than a web prompt', () => {
    const web = improveLocally('make website', analyzePrompt('make website'));
    const emailPrompt = 'draft an email to my landlord';
    const email = improveLocally(emailPrompt, analyzePrompt(emailPrompt));
    expect(email).toContain('Act as a professional communications writer.');
    expect(email).not.toContain('tech stack');
    expect(email).not.toBe(web);
  });

  it('asks for context on deictic prompts and keeps the writing role', () => {
    const out = improveLocally('summarize it', analyzePrompt('summarize it'));
    expect(out).toContain('Context:');
    expect(out).toContain('Act as an experienced editor.');
  });

  it('numbers multi-step prompts', () => {
    const prompt = 'research Apple then compare with Microsoft then build a table';
    const out = improveLocally(prompt, analyzePrompt(prompt));
    expect(out).toContain('1. research Apple');
    expect(out).toContain('2. compare with Microsoft');
    expect(out).toContain('3. build a table');
  });

  it('leaves an already-strong prompt untouched', () => {
    const prompt =
      'Act as a senior software engineer. Write a REST API endpoint in TypeScript with Express that returns paginated users. Output format: a single code block. It must include unit tests and handle at least 3 error cases.';
    const out = improveLocally(prompt, analyzePrompt(prompt));
    expect(out).toContain(prompt);
    expect(out).not.toContain('Act as a senior software engineer.\n\nAct as'); // no duplicate role
  });
});
