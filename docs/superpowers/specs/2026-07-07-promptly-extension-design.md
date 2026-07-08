# Promptly v0.1 — Design Spec

**Date:** 2026-07-07
**Status:** Approved (user-approved in brainstorming session)
**Source:** Promptly Browser Extension PRD v0.1

## 1. Overview

Promptly is a Chromium (Manifest V3) browser extension that acts like Grammarly, but for AI prompts. It activates only on AI websites, watches the prompt input as the user types, analyzes the prompt locally in real time, shows a small floating score badge, offers suggestions, and provides a one-click "Improve" that presents a diffed rewrite the user can accept or dismiss. It never modifies a prompt automatically and never sends prompt text anywhere except on an explicit cloud-improve action.

## 2. v0.1 Scope

**Included:**

- Site detection via a domain allowlist (manifest `matches`) — extension code never runs on non-AI sites.
- Prompt input detection: hand-tuned adapters for five flagship sites (ChatGPT, Claude, Gemini, Perplexity, Microsoft Copilot) plus a generic heuristic detector for all other allowlisted domains.
- Real-time local analysis (10 checks), component scores, and an overall 0–100 prompt score.
- Floating badge + suggestion card overlay (Shadow DOM, React).
- Improve button: instant local rule-based rewrite, plus optional cloud rewrite via a user-supplied Claude API key (BYO key).
- Diff view (original vs. improved, word-level highlights) with explicit Accept / Copy / Dismiss.
- Popup with settings: global enable/disable, per-site disable, theme (system/light/dark), cloud opt-in + API key, shortcut reference.
- Keyboard shortcut Ctrl+Shift+P to toggle the Promptly card on the active prompt input.

**Excluded (next cycle, structure reserved):** prompt history, prompt templates, AI profiles (per-model optimization), custom AI domains UI, auto-improve mode.

## 3. Architecture

**Chosen: Approach A — self-contained content script with Shadow DOM overlay.**

- One content script runs on allowlisted domains. It detects the prompt input, runs the analyzer **in-page** as pure synchronous TypeScript, and renders the UI as a React app inside a **Shadow DOM** host (`<promptly-root>`, `mode: 'open'`), so site CSS cannot bleed in and Promptly styles cannot leak out. (Open, not closed: the shadow boundary provides the style isolation either way, and Playwright cannot pierce closed roots, which would make the overlay untestable end-to-end.)
- The background service worker handles only: cloud rewrite API calls (the API key never enters page context), the `chrome.commands` keyboard shortcut, and storage default initialization.
- The popup is a small React app reading/writing `chrome.storage.local`.

**Rejected alternatives:**

- *B — background-centric analysis* (thin content-script sensor, analysis in the service worker): MV3 worker cold starts plus per-keystroke messaging latency blow the <50 ms analysis budget.
- *C — iframe overlay*: stronger isolation than Shadow DOM, but positioning an iframe over a moving input causes layout jank and every interaction becomes postMessage plumbing.

### Data flow

```
keystroke → 200 ms idle debounce → analyzer (sync, local) → findings
        → scorer → overlay (badge + suggestion card)
paste → analyzed immediately (no debounce)
600 ms poll → re-analyzes when the host app rewrites/clears the editor
              programmatically (no input event), incl. hiding on deletion

Improve click → local rewriter (instant, shown as diff)
             → [if cloud enabled] background → Claude API → diff updates
User Accepts → editor text replaced → re-analysis
```

Text replacement respects the editor type: native value setter + dispatched `input` event for `<textarea>`; `document.execCommand('insertText')` after select-all for contenteditable editors (ProseMirror/Lexical — used by ChatGPT, Claude, and most flagships).

## 4. Repository layout

Single Vite + React + TypeScript package, built with `@crxjs/vite-plugin` (MV3 multi-entry + HMR). Zustand for popup/overlay state, Tailwind CSS for the popup UI, hand-rolled scoped CSS injected into the shadow root for the overlay (Tailwind v4's `:root`-scoped theme variables and `@property` rules are unreliable inside shadow roots), `diff-match-patch` for diffs.

```
src/
  manifest.ts          # crxjs manifest definition
  content/             # bootstrap, editor tracker, debounced analysis loop
  adapters/            # site registry: flagship adapter configs + heuristic detector
  analyzer/            # 10 pure check functions + shared text utilities
  scorer/              # findings → component scores → overall 0–100
  improver/            # local rule-based rewriter + cloud client (via background)
  overlay/             # React app in shadow DOM: badge, card, diff view
  background/          # service worker: cloud proxy, commands, storage init
  popup/               # React settings app
  shared/              # types, messaging protocol, storage wrappers, constants
tests/
  unit/                # Vitest: analyzer, scorer, improver, adapters
  e2e/                 # Playwright: extension loaded against local fixture pages
  fixtures/            # HTML pages mimicking textarea / ProseMirror chat UIs
```

## 5. Site detection

### Domain allowlist (manifest `matches`)

Chat: `chatgpt.com`, `claude.ai`, `gemini.google.com`, `copilot.microsoft.com`, `grok.com`, `perplexity.ai`, `chat.deepseek.com`, `poe.com`, `chat.mistral.ai` (Le Chat).
Agent platforms: `notebooklm.google.com`, `manus.im`, `lovable.dev`, `bolt.new`, `v0.app`, `v0.dev`, `replit.com`, `cursor.com`, `app.devin.ai`, `windsurf.com`, `studio.firebase.google.com`, `aistudio.google.com`, `platform.openai.com`, `console.anthropic.com`.
(OpenAI Codex and Claude Code Web live under `chatgpt.com` / `claude.ai` and are covered by those entries.)

The registry is data-driven (one array in `src/adapters/registry.ts`); adding or correcting a domain is a one-line change. "Never activate on" sites (Gmail, Docs, social media, …) are enforced structurally: they are simply not in `matches`, and the extension requests no broad host permissions.

### Input detection

- **Flagship adapters** (ChatGPT, Claude, Gemini, Perplexity, Copilot): per-site config objects — CSS selectors for the prompt editor and send button, editor kind (`textarea` | `contenteditable`), and quirks. Selectors prefer stable attributes (`data-testid`, `role`, `aria-label`) over class names.
- **Heuristic fallback** (all other domains, and flagships when the adapter's selectors miss): score visible candidates — `textarea` and `[contenteditable="true"]` elements that are in the lower portion of the viewport, reasonably wide, and near a button whose accessible name matches send/submit/run/ask patterns. Highest-scoring visible candidate wins; re-evaluated on focus changes and SPA navigations (MutationObserver scoped to `document.body`, throttled).

## 6. Analyzer

Ten pure, synchronous check functions. Each returns zero or more findings: `{ checkId, component, severity: 'info' | 'warn' | 'high', message, suggestion }`. English-only heuristics for v0.1.

1. **Clarity** — prompt too short (< 4 meaningful words) or built on vague verbs ("make", "do", "fix", "improve") without a specific object.
2. **Missing context** — deictic references ("this", "it", "that file", "the doc") with no antecedent in the prompt.
3. **Missing constraints** — task-type detection (coding / writing / research / analysis) → expected constraint slots (language/framework; length/tone/audience; timeframe/sources) unfilled.
4. **Missing output format** — no format signal (list, table, JSON, markdown, word count, code block) on an artifact-producing task.
5. **Ambiguity** — pronouns without antecedents, vague quantifiers ("some", "a few", "several"), unresolved either/or.
6. **Objective** — no actionable verb or stated goal detected → suggest stating what the AI should accomplish.
7. **Success criteria** — substantial task (≥ 12 words, or any artifact-producing task) with no measurable acceptance signal (counts, formats, conditions).
8. **Role** — no "act as…" / "you are…" persona on a task that benefits from one → suggest a role matched to the detected task type.
9. **Tool readiness** — research/current-events cues ("latest", "research", "news", a company/ticker) → suggest enabling web search; file mentions → suggest attaching the file.
10. **Multi-step** — sequence connectives ("then", "after that", "finally", chains of imperative verbs) → suggest numbered steps.

The analyzer runs after a 300 ms typing pause; each run is budgeted at <50 ms (pure string operations on prompt-sized text — comfortably within budget). Prompts over 20,000 characters are analyzed on a truncated head + tail window.

## 7. Scorer

Seven components (per PRD): Clarity, Context, Constraints, Output Format, Objective, Ambiguity, AI Readiness (aggregates role, tool readiness, multi-step, success criteria). Each component starts at 100 and takes severity-weighted deductions from its findings (info −5, warn −15, high −30, floored at 0). Overall score = weighted mean:

| Component | Weight |
|---|---|
| Clarity | 20 |
| Objective | 20 |
| Context | 15 |
| Constraints | 15 |
| Output Format | 10 |
| Ambiguity | 10 |
| AI Readiness | 10 |

Prompts under 4 words cap the overall score at 40. Badge color bands: red < 50, amber 50–79, green ≥ 80.

## 8. Improver

- **Local (default, instant):** deterministic, prompt-tailored assembly (v0.2). Topic profiles (web, backend, automation, email, blog, academic, market research, data) refine the coarse task type into a specific role and topic-specific Constraints/Output-format hints; vague opener verbs on weak prompts are sharpened ("make website" → "Build website"); labeled sections (Context / Constraints / Output format / Success criteria) are appended only for detected gaps; detected step sequences become a numbered list. Values the rewriter cannot know are emitted as bracketed placeholders for the user to fill in the diff view. It never invents facts, and strong prompts pass through untouched.
- **AI providers (v0.2, opt-in):** the background worker picks the best available provider per Improve click — Anthropic key → OpenAI key → local Ollama (auto-detected on localhost:11434, first installed model, no key) → built-in rewriter. Remote providers require the cloud toggle + a key (origins `api.anthropic.com` / `api.openai.com` are optional host permissions requested on enable); Ollama requires only its own toggle (`http://localhost/*` optional permission) since nothing leaves the machine. The built-in fallback runs a filler-stripping + open-source tokenizer (compromise, dynamically imported on first Improve) pass before the rule engine, and the card shows a note when only the built-in rewrite was used. Errors surface inline; the built-in rewrite always remains available. A ⋯ button on the card opens the full settings page (options_ui).

Both paths feed the same diff view. Accept replaces the editor text; Copy puts the improved prompt on the clipboard; Dismiss closes. Never auto-applied.

## 9. Overlay UX

- **Badge (v0.2):** Grammarly-style frosted-glass "P" monogram (34 px circle, backdrop blur, monochrome — adapts to the browser theme with the popup's manual override winning) with a small attached score chip colored by band (red < 50, amber 50–79, green ≥ 80). Anchored to the prompt input's bottom-right corner (fixed-position layer — never affects page layout). Hidden until the input has ≥ 1 character; once analysis produces a score it stays visible while the prompt is non-empty. Typed input is debounced 200 ms; pasted input analyzes immediately.
- **Card:** opens on badge click or Ctrl+Shift+P. Shows overall score, per-component bars, grouped suggestions, and the Improve button. Improve switches the card to the diff view.
- **Theme:** follows `prefers-color-scheme`, overridable in settings. All styles live inside the shadow root.

## 10. Storage & messaging

`chrome.storage.local`, key `settings`:

```ts
{
  enabled: boolean;            // default true
  disabledSites: string[];     // hostnames
  theme: 'system' | 'light' | 'dark';
  cloudEnabled: boolean;       // default false
  apiKey?: string;             // network use only in background; stripped before content-script state
  model: string;               // default 'claude-sonnet-5'
}
```

Keys for history/templates/profiles are reserved but unused in v0.1. Typed messaging protocol (discriminated unions in `src/shared/messages.ts`): `CLOUD_IMPROVE_REQUEST` / `CLOUD_IMPROVE_RESULT`, `TOGGLE_CARD` (command → content script). Settings changes propagate via `chrome.storage.onChanged`.

## 11. Privacy

No analytics, no server, no telemetry. Prompt text never leaves the machine except when the user has (a) enabled cloud optimization, (b) granted the API host permission, and (c) clicked Improve. The API key is stored locally; only the background worker uses it for network calls (the popup manages it as a masked settings field and never touches the network).

## 12. Error handling

- Adapter selectors miss → heuristic fallback; heuristic finds nothing → Promptly stays dormant (no errors, no UI).
- The content-script bootstrap wraps detection/analysis/render in a top-level try/catch: a Promptly failure must never break the host page.
- Cloud errors → inline message in the card with the local rewrite still shown.
- Editor replacement failure (site swallowed the event) → fall back to Copy with a "copied — paste to replace" notice.

## 13. Performance budgets (from PRD)

Startup < 100 ms (content script defers work until an input is found); analysis < 50 ms (sync, debounced 300 ms); memory < 100 MB; zero layout shift (overlay is an isolated fixed layer); no typing lag (no per-keystroke messaging or DOM writes).

## 14. Testing

- **Vitest** unit tests for analyzer checks, scorer math, local improver, and adapter/heuristic scoring logic (the bulk of the logic is pure functions).
- **Playwright** e2e: Chromium launched with `--load-extension`, against local fixture pages that mimic a textarea-based chat UI and a ProseMirror contenteditable UI. Verifies: activation only on matched pages, badge appears on typing, score updates, suggestion card opens, Accept replaces editor text. Live sites are login-walled and CI-hostile; flagship verification is a manual checklist.
- **ESLint + Prettier** enforced; `tsc --noEmit` in CI script.

## 15. Success criteria (v0.1)

Typing a weak prompt on any flagship site shows a score badge within a second of pausing; opening the card lists actionable suggestions; Improve produces a visibly better structured prompt as a diff; Accept replaces the text in the real editor; the extension is silent on every non-AI site and costs no perceivable typing latency.
