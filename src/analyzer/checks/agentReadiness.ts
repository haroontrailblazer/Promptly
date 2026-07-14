import type { Check } from './clarity';
import type { Finding } from '../../shared/types';
import { MEASURABLE } from './successCriteria';

// Agent platforms execute rather than converse: prompts need concrete targets,
// invocable skills, and acceptance criteria the agent can verify itself.
export const checkAgentReadiness: Check = (ctx) => {
  const platform = ctx.platform;
  if (platform?.kind !== 'agent') return [];
  const findings: Finding[] = [];

  if (platform.commands?.length && !/(^|\s)\//.test(ctx.text)) {
    findings.push({
      checkId: 'agent-skills',
      component: 'aiReadiness',
      severity: 'info',
      message: `${platform.name} has built-in skills`,
      suggestion: `Invoke one directly where it fits, e.g. ${platform.commands.slice(0, 3).join(' · ')}.`,
    });
  }

  if (platform.mentions?.length && !ctx.text.includes('@')) {
    findings.push({
      checkId: 'agent-mentions',
      component: 'aiReadiness',
      severity: 'info',
      message: 'No concrete target',
      suggestion: `Point the agent at exact files or resources with ${platform.mentions.slice(0, 2).join(' / ')}.`,
    });
  }

  if (ctx.meaningful.length >= 2 && !MEASURABLE.test(ctx.text)) {
    findings.push({
      checkId: 'agent-acceptance',
      component: 'aiReadiness',
      severity: 'warn',
      message: 'No acceptance criteria',
      suggestion:
        'Agents verify their own work — state what done means: tests pass, build green, the page renders.',
    });
  }

  return findings;
};
