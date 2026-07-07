import type { Check } from './clarity';

const ACTION =
  /\b(write|create|generate|build|make|explain|summarize|summarise|analyze|analyse|compare|list|fix|debug|translate|draft|design|plan|research|find|review|improve|convert|calculate|extract|classify|outline|refactor|implement|optimize|describe|answer|solve|suggest|recommend|brainstorm|evaluate|help|give|show|tell)\b/i;
const QUESTION = /\?\s*$|^\s*(what|how|why|when|where|who|which|is|are|can|should|does|do)\b/i;

export const checkObjective: Check = (ctx) => {
  if (ACTION.test(ctx.text) || QUESTION.test(ctx.text)) return [];
  return [
    {
      checkId: 'objective-missing',
      component: 'objective',
      severity: 'high',
      message: 'No clear objective',
      suggestion:
        'State what the AI should accomplish, e.g. "Summarize…", "Generate…", "Compare…".',
    },
  ];
};
