import type { TaskType } from '../shared/types';

export interface CheckContext {
  text: string;
  allWords: string[];
  meaningful: string[];
  taskType: TaskType;
}

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'please',
  'can',
  'you',
  'could',
  'would',
  'me',
  'my',
  'i',
  'to',
  'for',
  'of',
  'and',
  'just',
  'hi',
  'hey',
  'hello',
]);

export function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function meaningfulWords(text: string): string[] {
  return words(text)
    .map((w) =>
      w
        .toLowerCase()
        .replace(/[^\p{L}\p{N}#+.-]/gu, '')
        .replace(/^[.-]+|[.-]+$/g, ''),
    )
    .filter((w) => w && !STOPWORDS.has(w));
}
