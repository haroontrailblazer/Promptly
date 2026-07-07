import type { TaskType } from '../shared/types';

const CODING =
  /\b(code|coding|website|web app|webapp|function|bug|debug|refactor|api|script|program|class|component|endpoint|sql|regex|unit test|typescript|python|javascript|java|c\+\+|c#|rust|golang|implement|compile|deploy)\b/i;
const RESEARCH =
  /\b(research|find out|look up|latest|news|market|trends|sources|investigate|statistics)\b/i;
const ANALYSIS =
  /\b(analy[sz]e|evaluate|assess|interpret|examine|breakdown|insights|metrics|data)\b/i;
const WRITING =
  /\b(write|draft|essay|blog|article|email|post|copy|story|report|letter|caption|headline|rewrite|summar\w*)\b/i;

export function detectTaskType(text: string): TaskType {
  if (CODING.test(text)) return 'coding';
  if (RESEARCH.test(text)) return 'research';
  if (ANALYSIS.test(text)) return 'analysis';
  if (WRITING.test(text)) return 'writing';
  return 'general';
}
