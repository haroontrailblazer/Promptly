# Manual flagship checklist

Live sites are login-walled, so adapter selectors are verified by hand before a
release. For each site: log in, open a new chat, then confirm each row.

Sites: ChatGPT (chatgpt.com), Claude (claude.ai), Gemini (gemini.google.com),
Perplexity (perplexity.ai), Copilot (copilot.microsoft.com).

| #   | Check                                                                              |
| --- | ---------------------------------------------------------------------------------- |
| 1   | Badge appears within ~1s of pausing after typing `make website`                    |
| 2   | Badge score is red (<50) for `make website`                                        |
| 3   | Clicking the badge opens the card with suggestions                                 |
| 4   | Improve shows a diff; Accept replaces the editor text correctly (no lost newlines) |
| 5   | Site's own send button still works after Accept                                    |
| 6   | Ctrl+Shift+P toggles the card                                                      |
| 7   | No console errors from the content script                                          |
| 8   | Typing feels lag-free in a long prompt (500+ words)                                |
| 9   | Disabling the site in the popup removes the badge after reload                     |

If a selector broke: fix `src/adapters/registry.ts`, re-run this checklist for
that site only.
