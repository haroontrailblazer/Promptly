import type { Check } from './clarity';
import { ARTIFACT_RE } from './outputFormat';

const MEASURABLE =
  /\b(\d+\s*(words?|items?|steps?|examples?|points?|sentences?|paragraphs?|sources?)|at least|at most|no more than|must (include|contain|have|be)|should (include|contain)|criteria|checklist)\b/i;

export const checkSuccessCriteria: Check = (ctx) => {
  const substantial = ctx.allWords.length >= 12 || ARTIFACT_RE.test(ctx.text);
  if (!substantial || MEASURABLE.test(ctx.text)) return [];
  return [
    {
      checkId: 'success-missing',
      component: 'aiReadiness',
      severity: 'info',
      message: 'No success criteria',
      suggestion: 'Define what "done well" means: length, required sections, examples, must-includes.',
    },
  ];
};
