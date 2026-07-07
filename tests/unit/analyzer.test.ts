import { describe, expect, it } from 'vitest';
import { analyzePrompt } from '../../src/analyzer';

describe('analyzePrompt', () => {
  it('tears apart "make website"', () => {
    const r = analyzePrompt('make website');
    const ids = r.findings.map((f) => f.checkId);
    expect(ids).toContain('clarity-short');
    expect(ids).toContain('constraints-missing');
    expect(ids).toContain('format-missing');
    expect(r.taskType).toBe('coding');
    expect(r.score.overall).toBeLessThanOrEqual(40);
  });

  it('scores a strong prompt high', () => {
    const r = analyzePrompt(
      'Act as a senior software engineer. Write a REST API endpoint in TypeScript with Express that returns paginated users. Output format: a single code block. It must include unit tests and handle at least 3 error cases.',
    );
    expect(r.score.overall).toBeGreaterThanOrEqual(80);
  });

  it('handles huge prompts without throwing', () => {
    const r = analyzePrompt('summarize this. '.repeat(5000));
    expect(r.score.overall).toBeGreaterThanOrEqual(0);
  });
});
