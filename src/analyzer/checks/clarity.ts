import type { Finding } from '../../shared/types';
import type { CheckContext } from '../text';

export type Check = (ctx: CheckContext) => Finding[];

const VAGUE_VERBS = /\b(make|do|fix|improve|help|change|update|handle|sort out)\b/i;

export const checkClarity: Check = (ctx) => {
  const findings: Finding[] = [];
  if (ctx.meaningful.length < 4) {
    findings.push({
      checkId: 'clarity-short',
      component: 'clarity',
      severity: 'high',
      message: 'Prompt is very short',
      suggestion: 'Add what you want, about what, and any specifics the AI needs.',
    });
  }
  if (VAGUE_VERBS.test(ctx.text) && ctx.meaningful.length < 8) {
    findings.push({
      checkId: 'clarity-vague',
      component: 'clarity',
      severity: 'warn',
      message: 'Vague action word without specifics',
      suggestion: 'Replace vague verbs like "make/fix/improve" with a concrete, measurable request.',
    });
  }
  return findings;
};
