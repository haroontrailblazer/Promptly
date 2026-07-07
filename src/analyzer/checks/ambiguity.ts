import type { Check } from './clarity';
import type { Finding } from '../../shared/types';

const QUANTIFIER = /\b(some|a few|several|various|a bunch of|stuff|things)\b/i;
const EITHER_OR = /\b\w+\s+or\s+\w+/i;

export const checkAmbiguity: Check = (ctx) => {
  const findings: Finding[] = [];
  if (QUANTIFIER.test(ctx.text)) {
    findings.push({
      checkId: 'ambiguity-quantifier',
      component: 'ambiguity',
      severity: 'warn',
      message: 'Vague quantity ("some", "a few", …)',
      suggestion: 'Say exactly how many you want.',
    });
  }
  if (EITHER_OR.test(ctx.text)) {
    findings.push({
      checkId: 'ambiguity-or',
      component: 'ambiguity',
      severity: 'info',
      message: 'Unresolved either/or',
      suggestion: 'Pick one option, or say you want both compared.',
    });
  }
  return findings;
};
