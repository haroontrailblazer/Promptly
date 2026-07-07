import type { Check } from './clarity';
import type { Finding } from '../../shared/types';

const FRESH_INFO =
  /\b(latest|current|today|this (week|month|year)|recent|news|stock price|market|research|look up|find out)\b/i;
const FILE_REF =
  /\b(attached|attachment|this (file|pdf|doc|document|image|screenshot|csv|spreadsheet)|the (file|pdf|doc|document))\b/i;

export const checkToolReadiness: Check = (ctx) => {
  const findings: Finding[] = [];
  if (FRESH_INFO.test(ctx.text)) {
    findings.push({
      checkId: 'tool-web-search',
      component: 'aiReadiness',
      severity: 'info',
      message: 'Needs fresh information',
      suggestion: 'Enable web search (if the AI supports it) so answers are not stale.',
    });
  }
  if (FILE_REF.test(ctx.text)) {
    findings.push({
      checkId: 'tool-file',
      component: 'aiReadiness',
      severity: 'info',
      message: 'References a file',
      suggestion: 'Make sure the file is actually attached or pasted.',
    });
  }
  return findings;
};
