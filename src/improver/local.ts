import type { AnalysisResult, TaskType } from '../shared/types';
import { ROLE_BY_TASK } from '../analyzer/checks/role';

// Topic profiles refine the coarse TaskType with prompt-specific roles and
// hints, so two different weak prompts get visibly different scaffolding.
interface TopicProfile {
  re: RegExp;
  role: string;
  constraints: string;
  format: string;
}

const TOPICS: TopicProfile[] = [
  {
    re: /\b(website|web ?app|landing page|web ?page|frontend|front[- ]end|ui|component)\b/i,
    role: 'a senior front-end engineer',
    constraints:
      '[tech stack — e.g. React, Next.js, or plain HTML/CSS — plus responsive/browser requirements]',
    format: '[complete code, file by file, with brief setup notes]',
  },
  {
    re: /\b(api|endpoint|backend|back[- ]end|server|database|sql|schema)\b/i,
    role: 'a senior backend engineer',
    constraints: '[language/framework, database, auth model, error-handling expectations]',
    format: '[a code block per file, with example requests and responses]',
  },
  {
    re: /\b(script|automation|automate|cli|pipeline)\b/i,
    role: 'an automation engineer',
    constraints: '[language, runtime/OS, inputs and outputs, what should happen on failure]',
    format: '[a single runnable script with usage comments]',
  },
  {
    re: /\b(email|letter|reply|response to)\b/i,
    role: 'a professional communications writer',
    constraints: '[recipient and relationship, tone (formal/friendly), rough length]',
    format: '[subject line + body, ready to send]',
  },
  {
    re: /\b(blog|article|post|newsletter|caption|headline)\b/i,
    role: 'an experienced content writer',
    constraints: '[audience, tone, target word count, keywords if any]',
    format: '[markdown with headings and a short intro]',
  },
  {
    re: /\b(essay|paper|thesis|literature review|academic)\b/i,
    role: 'an academic writing coach',
    constraints: '[citation style, word count, level (school/university), allowed sources]',
    format: '[structured sections with citations]',
  },
  {
    re: /\b(market|stock|compan(y|ies)|competitor|industry|trends?|news)\b/i,
    role: 'a meticulous research analyst',
    constraints: '[timeframe, regions/markets, source quality — ask for citations]',
    format: '[a comparison table plus short takeaways, with sources]',
  },
  {
    re: /\b(report|metrics|kpis?|dataset|spreadsheet)\b/i,
    role: 'a data analyst',
    constraints: '[the metrics that matter, the baseline to compare against, timeframe]',
    format: '[key findings as bullets, then a table of the numbers]',
  },
];

const FALLBACK_CONSTRAINTS: Record<TaskType, string> = {
  coding: '[language/framework and version]',
  writing: '[length, tone, audience]',
  research: '[timeframe and required sources]',
  analysis: '[criteria and metrics to judge against]',
  general: '[any limits or requirements]',
};

const FALLBACK_FORMAT: Record<TaskType, string> = {
  coding: '[a single code block, or file-by-file]',
  writing: '[markdown with headings, or plain paragraphs]',
  research: '[a short summary plus a table, with sources]',
  analysis: '[key findings as bullets, then supporting detail]',
  general: '[bullet list / table / JSON / markdown]',
};

const SUCCESS_HINT: Record<TaskType, string> = {
  coding: '[it runs without errors and covers the must-have features you list here]',
  writing: '[target length hit, required points covered, right tone]',
  research: '[claims backed by sources, timeframe respected, question actually answered]',
  analysis: '[metrics reported against the baseline, with a clear recommendation at the end]',
  general: '[what a great answer must include to be useful to you]',
};

// "make X" is the single biggest vagueness offender — sharpen the opener verb
// into a concrete instruction. Never touches anything past the first word.
const SHARP_OPENERS: Record<string, Partial<Record<TaskType, string>> & { general: string }> = {
  make: { coding: 'Build', writing: 'Write', general: 'Create' },
  do: { general: 'Complete' },
  fix: { coding: 'Debug and fix', general: 'Fix' },
  improve: { coding: 'Refactor and improve', writing: 'Revise and improve', general: 'Improve' },
};

function sharpenOpener(text: string, taskType: TaskType): string {
  return text.replace(/^\s*(make|do|fix|improve)\b/i, (m) => {
    const entry = SHARP_OPENERS[m.trim().toLowerCase()];
    return entry[taskType] ?? entry.general;
  });
}

// The noun phrase right after the leading verb — used to personalize placeholders.
const SUBJECT_RE =
  /\b(?:make|build|create|write|generate|draft|design|fix|improve|analy[sz]e|summari[sz]e|research|compare|plan|refactor|debug|translate|review|explain)\s+(?:me\s+)?(?:a\s+|an\s+|the\s+|some\s+|my\s+)?([\w][\w\s'-]{1,50}?)(?=[.,;:!?\n]|$|\s+(?:and|then|that|which|so|for|in|with|to|about|of)\b)/i;

const PRONOUNS = new Set(['it', 'this', 'that', 'them', 'these', 'those', 'me', 'us']);

export function extractSubject(prompt: string): string | null {
  const m = prompt.match(SUBJECT_RE);
  if (!m) return null;
  const subject = m[1].trim();
  return PRONOUNS.has(subject.toLowerCase()) ? null : subject;
}

function toNumberedSteps(prompt: string): string {
  const steps = prompt
    .split(/\b(?:and then|then|after that|afterwards|next,?|finally)\b/i)
    .map((s) =>
      s
        .trim()
        .replace(/^[,.;]+|[,.;]+$/g, '')
        .trim(),
    )
    .filter(Boolean);
  if (steps.length < 2) return prompt.trim();
  return steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
}

// Map prompt intent to a platform slash-skill so simple asks become direct
// skill invocations ("review my code" → "/review my code").
const COMMAND_INTENTS: [RegExp, string][] = [
  [/\b(review|check|audit)\b/i, '/review'],
  [/\b(plan|design|architect)\b/i, '/plan'],
  [/\b(test|tests|verify)\b/i, '/test'],
  [/\b(commit|push)\b/i, '/commit'],
];
const LEADING_INTENT = /^\s*(please\s+)?(review|check|audit|plan|design|test|verify|commit)\s+/i;

function matchCommand(text: string, commands: string[]): string | null {
  for (const [re, cmd] of COMMAND_INTENTS) {
    if (commands.includes(cmd) && re.test(text)) return cmd;
  }
  return null;
}

// Agents execute rather than converse: no persona — concrete targets,
// constraints, and acceptance criteria the agent can verify itself.
function improveForAgent(prompt: string, analysis: AnalysisResult): string {
  const has = (id: string) => analysis.findings.some((f) => f.checkId === id);
  const platform = analysis.platform;
  const trimmed = prompt.trim();

  let core = has('steps-unstructured') ? toNumberedSteps(trimmed) : trimmed;
  if (has('clarity-vague') || has('clarity-short')) core = sharpenOpener(core, analysis.taskType);
  const cmd = matchCommand(trimmed, platform?.commands ?? []);
  if (cmd && !/^\s*\//.test(trimmed)) core = `${cmd} ${core.replace(LEADING_INTENT, '')}`;

  const out: string[] = [core];
  if (has('context-deictic') || has('agent-mentions')) {
    out.push(
      platform?.mentions?.length
        ? `Target: ${platform.mentions[0]} [point at the exact files, folders, or resources]`
        : 'Target: [name the exact files, folders, or URLs to work on]',
    );
  }
  if (has('constraints-missing')) {
    out.push('Constraints: [stack, versions, and conventions the agent must follow]');
  }
  if (has('success-missing') || has('agent-acceptance')) {
    out.push(
      'Acceptance criteria: [how the agent verifies done — tests pass, build green, feature works]',
    );
  }
  return out.join('\n\n');
}

export function improveLocally(prompt: string, analysis: AnalysisResult): string {
  if (analysis.platform?.kind === 'agent') return improveForAgent(prompt, analysis);
  const trimmed = prompt.trim();
  const has = (id: string) => analysis.findings.some((f) => f.checkId === id);
  const topic = TOPICS.find((t) => t.re.test(trimmed)) ?? null;
  const subject = extractSubject(trimmed);
  const { taskType } = analysis;
  const out: string[] = [];

  if (has('role-missing')) out.push(`Act as ${topic?.role ?? ROLE_BY_TASK[taskType]}.`);

  let core = has('steps-unstructured') ? toNumberedSteps(trimmed) : trimmed;
  if (has('clarity-vague') || has('clarity-short')) core = sharpenOpener(core, taskType);
  out.push(core);

  if (has('context-deictic')) {
    out.push(
      `Context: [describe what ${subject ? `"${subject}"` : 'this'} refers to — paste the text or file details]`,
    );
  }
  if (has('constraints-missing')) {
    out.push(`Constraints: ${topic?.constraints ?? FALLBACK_CONSTRAINTS[taskType]}`);
  }
  if (has('format-missing')) {
    out.push(`Output format: ${topic?.format ?? FALLBACK_FORMAT[taskType]}`);
  }
  if (has('success-missing')) {
    out.push(`Success criteria: ${SUCCESS_HINT[taskType]}`);
  }
  return out.join('\n\n');
}
