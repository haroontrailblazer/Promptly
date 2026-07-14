// Promptly UserPromptSubmit hook: score the prompt; when it's weak, hand
// Claude the improved framing as extra context. Never blocks, never edits
// the user's words - additive context only, fully local.
import { readFileSync } from 'node:fs';

const BOM = /^\uFEFF/;

let input;
try {
  // Strip a UTF-8 BOM - Windows shells prepend one when piping.
  input = JSON.parse(readFileSync(0, 'utf8').replace(BOM, ''));
} catch (e) {
  if (process.env.PROMPTLY_DEBUG) console.error('[promptly hook] stdin parse:', e);
  process.exit(0);
}

const prompt = (input?.prompt ?? '').trim();
// Skip commands, bash passthroughs, memory notes, and trivial one-worders.
if (!prompt || /^[/!#]/.test(prompt) || prompt.split(/\s+/).length < 2) process.exit(0);

try {
  const engine = await import(new URL('../engine/promptly.mjs', import.meta.url));
  const profile = engine.claudeCodeProfile(input.cwd);
  const analysis = engine.analyze(prompt, { profile });
  const min = Number(process.env.PROMPTLY_MIN_SCORE ?? 70);
  if (analysis.score.overall >= min) process.exit(0);

  const improved = await engine.improve(prompt, { profile, local: true });
  const gaps = analysis.findings.map((f) => f.message).join('; ');
  console.log(
    [
      `[Promptly] The user's prompt scored ${analysis.score.overall}/100. Gaps: ${gaps}.`,
      'A stronger framing of the same request (placeholders in [brackets] are unknowns - ask or infer, never invent):',
      improved,
      "Honor the user's original wording where they conflict; use this framing to fill in what they left implicit, and prefer the referenced skills/subagents when they fit.",
    ].join('\n'),
  );
} catch (e) {
  // The hook must never break prompting; surface details only on demand.
  if (process.env.PROMPTLY_DEBUG) console.error('[promptly hook]', e);
}
process.exit(0);
