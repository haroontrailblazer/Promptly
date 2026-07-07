import type { Check } from './clarity';

export const ARTIFACT_RE =
  /\b(write|generate|create|make|build|draft|produce|compose|summarize|summarise|list|compare|report|design|outline|plan)\b/i;
const FORMAT_RE =
  /\b(bullet(ed)?( list)?|bullets?|list|table|json|markdown|csv|xml|yaml|numbered|outline|slides?|paragraphs?|\d+\s*words?|code block|diagram|schema|essay)\b/i;

export const checkOutputFormat: Check = (ctx) => {
  if (!ARTIFACT_RE.test(ctx.text) || FORMAT_RE.test(ctx.text)) return [];
  return [
    {
      checkId: 'format-missing',
      component: 'outputFormat',
      severity: 'warn',
      message: 'No output format specified',
      suggestion: 'Say how you want the answer: bullet list, table, JSON, markdown, word count…',
    },
  ];
};
