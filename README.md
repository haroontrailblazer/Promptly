# Promptly

Grammarly for AI prompts — a Chromium (Manifest V3) extension that analyzes your
prompt as you type on AI sites (ChatGPT, Claude, Gemini, Perplexity, Copilot, and
~20 more), shows a score badge, suggests fixes, and offers a one-click improved
rewrite you can accept or dismiss. It never changes your prompt automatically and
never sends prompt text anywhere unless you enable cloud optimization and click
Improve.

## Develop

```bash
npm install
npm run icons      # regenerate placeholder icons (checked in under public/)
npm run dev        # vite dev build with HMR
npm run build      # typecheck + production build into dist/
```

Load it: `chrome://extensions` → enable Developer mode → "Load unpacked" → select `dist/`.

## Test

```bash
npm test           # unit tests (Vitest)
npm run test:e2e   # builds dist-e2e (adds localhost to matches) + Playwright
npm run lint
```

## Architecture

See `docs/superpowers/specs/2026-07-07-promptly-extension-design.md`. Short version:
content script detects the prompt editor (per-site adapters in `src/adapters/registry.ts`,
heuristic fallback), analyzes locally (`src/analyzer`, `src/scorer`), renders a Shadow-DOM
overlay (`src/overlay`), and the background worker proxies opt-in cloud rewrites
(`src/background/cloud.ts`) using your own Anthropic API key.

## Privacy

Local-first. No analytics, no server. The only network call is the opt-in cloud
rewrite to `api.anthropic.com` with your own key, on an explicit click.
