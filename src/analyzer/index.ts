import type { AnalysisResult } from '../shared/types';
import { meaningfulWords, words, type CheckContext } from './text';
import { detectTaskType } from './taskType';
import { scorePrompt } from '../scorer';
import { checkClarity, type Check } from './checks/clarity';
import { checkContext } from './checks/context';
import { checkAmbiguity } from './checks/ambiguity';
import { checkObjective } from './checks/objective';
import { checkConstraints } from './checks/constraints';
import { checkOutputFormat } from './checks/outputFormat';
import { checkSuccessCriteria } from './checks/successCriteria';
import { checkRole } from './checks/role';
import { checkToolReadiness } from './checks/toolReadiness';
import { checkMultiStep } from './checks/multiStep';

const CHECKS: Check[] = [
  checkClarity,
  checkContext,
  checkAmbiguity,
  checkObjective,
  checkConstraints,
  checkOutputFormat,
  checkSuccessCriteria,
  checkRole,
  checkToolReadiness,
  checkMultiStep,
];

const MAX_ANALYZE = 20_000;

export function analyzePrompt(raw: string): AnalysisResult {
  const text =
    raw.length > MAX_ANALYZE ? `${raw.slice(0, 15_000)}\n${raw.slice(-5_000)}` : raw;
  const taskType = detectTaskType(text);
  const ctx: CheckContext = {
    text,
    allWords: words(text),
    meaningful: meaningfulWords(text),
    taskType,
  };
  const findings = CHECKS.flatMap((check) => check(ctx));
  return { findings, score: scorePrompt(findings, ctx.meaningful.length), taskType };
}
