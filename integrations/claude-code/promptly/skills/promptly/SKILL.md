---
name: promptly
description: Score or improve an AI prompt using the Promptly engine. Use when the user asks to improve, score, rewrite, or polish a prompt, or types /promptly followed by a prompt.
---

# Promptly — score and improve prompts

The Promptly engine ships with this plugin as a self-contained Node script.

## Score a prompt

```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/promptly.mjs" score --stdin --platform claude-code
```

Pass the prompt text on stdin. Output lists the 0–100 score and each finding.

## Improve a prompt

```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/promptly.mjs" improve --stdin --platform claude-code --local
```

Pass the prompt text on stdin; stdout is the rewritten prompt. With
`--platform claude-code` the rewrite is reframed around the skills and
subagents actually installed on this machine (discovered from `.claude/`),
so simple asks become direct skill invocations.

## Rules

- Show the user the improved prompt; never silently substitute it.
- Placeholders in `[brackets]` are unknowns the user must fill — ask about
  them or leave them visible, never invent values.
- Drop `--local` only if the user explicitly wants an AI-provider rewrite
  (uses ANTHROPIC_API_KEY / OPENAI_API_KEY / PROMPTLY_OLLAMA=1 from the
  environment).
