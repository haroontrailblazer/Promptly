import type { Check } from './clarity';
import type { TaskType } from '../../shared/types';

const SIGNALS: Partial<Record<TaskType, RegExp>> = {
  coding:
    /\b(python|typescript|javascript|\bjs\b|\bts\b|java|c#|c\+\+|rust|go|golang|ruby|php|swift|kotlin|sql|html|css|react|vue|svelte|angular|node(\.js)?|django|flask|spring|rails|next(\.js)?|\.net)\b/i,
  writing:
    /\b(\d+\s*(words?|paragraphs?|pages?)|short|brief|long|formal|informal|casual|professional|friendly|audience|tone|style)\b/i,
  research:
    /\b(20\d\d|today|this (year|month|week)|recent|last \d+|since \d{4}|sources?|cite|citations?|peer[- ]reviewed)\b/i,
  analysis: /\b(metrics?|criteria|kpis?|benchmark|against|compared? (to|with)|framework)\b/i,
};

const HINTS: Partial<Record<TaskType, string>> = {
  coding: 'Specify the language, framework, and version.',
  writing: 'Specify length, tone, and audience.',
  research: 'Specify the timeframe and required sources.',
  analysis: 'Specify the criteria or metrics to judge against.',
};

export const checkConstraints: Check = (ctx) => {
  const signal = SIGNALS[ctx.taskType];
  if (!signal || signal.test(ctx.text)) return [];
  return [
    {
      checkId: 'constraints-missing',
      component: 'constraints',
      severity: 'warn',
      message: 'Missing constraints',
      suggestion: HINTS[ctx.taskType]!,
    },
  ];
};
