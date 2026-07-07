import { describe, expect, it } from 'vitest';
import type { CheckContext } from '../../src/analyzer/text';
import { meaningfulWords, words } from '../../src/analyzer/text';
import { detectTaskType } from '../../src/analyzer/taskType';
import { checkConstraints } from '../../src/analyzer/checks/constraints';
import { checkOutputFormat } from '../../src/analyzer/checks/outputFormat';
import { checkSuccessCriteria } from '../../src/analyzer/checks/successCriteria';
import { checkRole } from '../../src/analyzer/checks/role';
import { checkToolReadiness } from '../../src/analyzer/checks/toolReadiness';
import { checkMultiStep } from '../../src/analyzer/checks/multiStep';

function ctx(text: string): CheckContext {
  return { text, allWords: words(text), meaningful: meaningfulWords(text), taskType: detectTaskType(text) };
}
const ids = (f: { checkId: string }[]) => f.map((x) => x.checkId);

describe('constraints', () => {
  it('flags coding prompts without a language/framework', () => {
    expect(ids(checkConstraints(ctx('generate code for a login form')))).toContain('constraints-missing');
  });
  it('passes coding prompts that name a stack', () => {
    expect(checkConstraints(ctx('generate a login form in React with TypeScript'))).toEqual([]);
  });
  it('flags writing prompts without length/tone/audience', () => {
    expect(ids(checkConstraints(ctx('draft a blog article about remote work')))).toContain('constraints-missing');
  });
  it('skips general prompts', () => {
    expect(checkConstraints(ctx('hello there my friend'))).toEqual([]);
  });
});

describe('output format', () => {
  it('flags artifact-producing prompts without a format', () => {
    expect(ids(checkOutputFormat(ctx('summarize the quarterly report')))).toContain('format-missing');
  });
  it('passes when a format is given', () => {
    expect(checkOutputFormat(ctx('summarize the quarterly report as a bullet list'))).toEqual([]);
  });
  it('skips non-artifact prompts', () => {
    expect(checkOutputFormat(ctx('why is the sky blue?'))).toEqual([]);
  });
});

describe('success criteria', () => {
  it('flags substantial prompts without measurable criteria', () => {
    expect(ids(checkSuccessCriteria(ctx('write a report about our onboarding funnel')))).toContain('success-missing');
  });
  it('passes when measurable criteria exist', () => {
    expect(checkSuccessCriteria(ctx('write a 1000 words report that must include citations'))).toEqual([]);
  });
});

describe('role', () => {
  it('suggests a role for non-general tasks', () => {
    expect(ids(checkRole(ctx('debug my python script')))).toContain('role-missing');
  });
  it('passes when a role exists', () => {
    expect(checkRole(ctx('Act as a senior engineer and debug my python script'))).toEqual([]);
  });
  it('skips general prompts', () => {
    expect(checkRole(ctx('good morning'))).toEqual([]);
  });
});

describe('tool readiness', () => {
  it('suggests web search for fresh-info prompts', () => {
    expect(ids(checkToolReadiness(ctx('research the latest Nvidia earnings')))).toContain('tool-web-search');
  });
  it('reminds about attachments for file prompts', () => {
    expect(ids(checkToolReadiness(ctx('summarize this pdf')))).toContain('tool-file');
  });
});

describe('multi-step', () => {
  it('suggests numbered steps for chained instructions', () => {
    expect(ids(checkMultiStep(ctx('research Apple then compare with Microsoft then build a table')))).toContain(
      'steps-unstructured',
    );
  });
  it('passes when steps are already numbered', () => {
    expect(checkMultiStep(ctx('1. research Apple\n2. compare with Microsoft'))).toEqual([]);
  });
});
