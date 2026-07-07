import { describe, expect, it } from 'vitest';
import type { CheckContext } from '../../src/analyzer/text';
import { meaningfulWords, words } from '../../src/analyzer/text';
import { detectTaskType } from '../../src/analyzer/taskType';
import { checkClarity } from '../../src/analyzer/checks/clarity';
import { checkContext } from '../../src/analyzer/checks/context';
import { checkAmbiguity } from '../../src/analyzer/checks/ambiguity';
import { checkObjective } from '../../src/analyzer/checks/objective';

function ctx(text: string): CheckContext {
  return {
    text,
    allWords: words(text),
    meaningful: meaningfulWords(text),
    taskType: detectTaskType(text),
  };
}

const ids = (findings: { checkId: string }[]) => findings.map((f) => f.checkId);

describe('clarity', () => {
  it('flags very short prompts as high severity', () => {
    const f = checkClarity(ctx('make website'));
    expect(ids(f)).toContain('clarity-short');
    expect(f.find((x) => x.checkId === 'clarity-short')?.severity).toBe('high');
  });
  it('flags vague verbs on thin prompts', () => {
    expect(ids(checkClarity(ctx('improve my landing page please')))).toContain('clarity-vague');
  });
  it('passes a specific prompt', () => {
    expect(
      checkClarity(
        ctx(
          'Write a 500-word product description for a solar-powered camping lantern aimed at hikers',
        ),
      ),
    ).toEqual([]);
  });
});

describe('context', () => {
  it('flags deictic references with no antecedent', () => {
    expect(ids(checkContext(ctx('Analyze this.')))).toContain('context-deictic');
    expect(ids(checkContext(ctx('summarize it for me')))).toContain('context-deictic');
  });
  it('does not flag when the reference names its object', () => {
    expect(
      checkContext(ctx('Analyze this quarterly sales report and highlight anomalies')),
    ).toEqual([]);
  });
});

describe('ambiguity', () => {
  it('flags vague quantifiers', () => {
    expect(ids(checkAmbiguity(ctx('give me some ideas and a few examples')))).toContain(
      'ambiguity-quantifier',
    );
  });
  it('flags unresolved either/or', () => {
    expect(ids(checkAmbiguity(ctx('write it in Python or JavaScript')))).toContain('ambiguity-or');
  });
  it('passes precise prompts', () => {
    expect(checkAmbiguity(ctx('List exactly 5 marketing channels ranked by cost'))).toEqual([]);
  });
});

describe('objective', () => {
  it('flags prompts with no actionable verb or question', () => {
    expect(ids(checkObjective(ctx('the quarterly report situation')))).toContain(
      'objective-missing',
    );
  });
  it('accepts imperative prompts', () => {
    expect(checkObjective(ctx('Summarize the attached PDF'))).toEqual([]);
  });
  it('accepts questions', () => {
    expect(checkObjective(ctx('What are the tradeoffs of SQLite vs Postgres?'))).toEqual([]);
  });
});
