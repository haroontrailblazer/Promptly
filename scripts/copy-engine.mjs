// Copies the built single-file engine into the Claude Code plugin so the
// plugin stays self-contained when installed from the marketplace.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('integrations/claude-code/promptly/engine', { recursive: true });
copyFileSync('bin/promptly.mjs', 'integrations/claude-code/promptly/engine/promptly.mjs');
console.log('engine copied into integrations/claude-code/promptly/engine/');
