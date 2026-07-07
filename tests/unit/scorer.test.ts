import { describe, expect, it } from 'vitest';
import { scorePrompt } from '../../src/scorer';
import type { Finding } from '../../src/shared/types';

const finding = (component: Finding['component'], severity: Finding['severity']): Finding => ({
  checkId: 'x', component, severity, message: '', suggestion: '',
});

describe('scorePrompt', () => {
  it('gives 100 with no findings', () => {
    const s = scorePrompt([], 20);
    expect(s.overall).toBe(100);
    expect(Object.values(s.components).every((c) => c === 100)).toBe(true);
  });

  it('deducts by severity within a component', () => {
    const s = scorePrompt([finding('clarity', 'high'), finding('clarity', 'warn')], 20);
    expect(s.components.clarity).toBe(55); // 100 - 30 - 15
  });

  it('floors components at 0', () => {
    const s = scorePrompt(Array(5).fill(finding('ambiguity', 'high')), 20);
    expect(s.components.ambiguity).toBe(0);
  });

  it('caps overall at 40 for prompts under 4 meaningful words', () => {
    const s = scorePrompt([], 2);
    expect(s.overall).toBe(40);
  });
});
