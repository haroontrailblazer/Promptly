import type { Component, Finding, ScoreResult, Severity } from '../shared/types';

const DEDUCTION: Record<Severity, number> = { info: 5, warn: 15, high: 30 };

const WEIGHTS: Record<Component, number> = {
  clarity: 20,
  objective: 20,
  context: 15,
  constraints: 15,
  outputFormat: 10,
  ambiguity: 10,
  aiReadiness: 10,
};

export const COMPONENT_LABELS: Record<Component, string> = {
  clarity: 'Clarity',
  context: 'Context',
  constraints: 'Constraints',
  outputFormat: 'Output Format',
  objective: 'Objective',
  ambiguity: 'Ambiguity',
  aiReadiness: 'AI Readiness',
};

export function scorePrompt(findings: Finding[], meaningfulCount: number): ScoreResult {
  const components = Object.fromEntries(Object.keys(WEIGHTS).map((c) => [c, 100])) as Record<
    Component,
    number
  >;

  for (const f of findings) {
    components[f.component] = Math.max(0, components[f.component] - DEDUCTION[f.severity]);
  }

  let overall = Math.round(
    Object.entries(WEIGHTS).reduce((sum, [c, w]) => sum + components[c as Component] * w, 0) / 100,
  );
  if (meaningfulCount < 4) overall = Math.min(overall, 40);

  return { overall, components };
}
