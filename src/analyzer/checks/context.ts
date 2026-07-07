import type { Check } from './clarity';

const LEADING_DEICTIC = /^(this|that|it|these|those)\b/i;
const VERB_DEICTIC =
  /\b(analyze|analyse|summarize|summarise|explain|improve|fix|translate|review|rewrite|check|describe)\s+(this|that|these|those)(?!\s+\w)/i;
const VERB_IT =
  /\b(analyze|analyse|summarize|summarise|explain|improve|fix|translate|review|rewrite|check|describe)\s+it\b/i;

export const checkContext: Check = (ctx) => {
  if (
    LEADING_DEICTIC.test(ctx.text.trim()) ||
    VERB_DEICTIC.test(ctx.text) ||
    VERB_IT.test(ctx.text)
  ) {
    return [
      {
        checkId: 'context-deictic',
        component: 'context',
        severity: 'warn',
        message: 'Unclear reference – what is "this"/"it"?',
        suggestion: 'Name the thing you are referring to, or paste/attach it.',
      },
    ];
  }
  return [];
};
