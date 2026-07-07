import type { Check } from './clarity';
import type { TaskType } from '../../shared/types';

export const ROLE_BY_TASK: Record<TaskType, string> = {
  coding: 'a senior software engineer',
  writing: 'an experienced editor',
  research: 'a meticulous research analyst',
  analysis: 'a data analyst',
  general: 'an expert assistant',
};

const ROLE_RE = /\b(act as|you are|you're an?|as an? (expert|senior|professional)|take the role|persona of)\b/i;

export const checkRole: Check = (ctx) => {
  if (ctx.taskType === 'general' || ROLE_RE.test(ctx.text)) return [];
  return [
    {
      checkId: 'role-missing',
      component: 'aiReadiness',
      severity: 'info',
      message: 'No role set',
      suggestion: `Add a role, e.g. "Act as ${ROLE_BY_TASK[ctx.taskType]}".`,
    },
  ];
};
