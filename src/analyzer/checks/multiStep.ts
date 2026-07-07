import type { Check } from './clarity';

const CONNECTIVE = /\b(and then|then|after that|afterwards|next,|finally|lastly)\b/i;
const ALREADY_NUMBERED = /^\s*\d+[.)]\s/m;

export const checkMultiStep: Check = (ctx) => {
  if (!CONNECTIVE.test(ctx.text) || ALREADY_NUMBERED.test(ctx.text)) return [];
  return [
    {
      checkId: 'steps-unstructured',
      component: 'aiReadiness',
      severity: 'info',
      message: 'Multi-step request without structure',
      suggestion: 'Break the workflow into numbered steps so nothing gets skipped.',
    },
  ];
};
