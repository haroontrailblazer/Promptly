import type { AnalysisResult, TaskType } from '../shared/types';
import { ROLE_BY_TASK } from '../analyzer/checks/role';

const CONSTRAINT_HINT: Record<TaskType, string> = {
  coding: '[language/framework and version]',
  writing: '[length, tone, audience]',
  research: '[timeframe and required sources]',
  analysis: '[criteria and metrics to judge against]',
  general: '[any limits or requirements]',
};

function toNumberedSteps(prompt: string): string {
  const steps = prompt
    .split(/\b(?:and then|then|after that|afterwards|next,?|finally)\b/i)
    .map((s) =>
      s
        .trim()
        .replace(/^[,.;]+|[,.;]+$/g, '')
        .trim(),
    )
    .filter(Boolean);
  if (steps.length < 2) return prompt.trim();
  return steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
}

export function improveLocally(prompt: string, analysis: AnalysisResult): string {
  const has = (id: string) => analysis.findings.some((f) => f.checkId === id);
  const out: string[] = [];

  if (has('role-missing')) out.push(`Act as ${ROLE_BY_TASK[analysis.taskType]}.`);
  out.push(has('steps-unstructured') ? toNumberedSteps(prompt) : prompt.trim());
  if (has('context-deictic')) {
    out.push('Context: [describe what you are referring to – paste the text or file details]');
  }
  if (has('constraints-missing')) out.push(`Constraints: ${CONSTRAINT_HINT[analysis.taskType]}`);
  if (has('format-missing')) out.push('Output format: [bullet list / table / JSON / markdown]');
  if (has('success-missing')) {
    out.push(
      'Success criteria: [what must be true for this to be done well – length, sections, examples]',
    );
  }
  return out.join('\n\n');
}
