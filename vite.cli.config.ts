import { defineConfig } from 'vite';

// Bundles the Promptly engine + CLI into one self-contained Node file — the
// same artifact powers the terminal CLI, the Claude Code plugin hook, and the
// MCP server, so it must not rely on node_modules at runtime.
export default defineConfig({
  build: {
    target: 'node18',
    outDir: 'bin',
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: 'src/cli/index.ts',
      formats: ['es'],
      fileName: () => 'promptly.mjs',
    },
    rollupOptions: {
      external: [/^node:/],
      output: {
        inlineDynamicImports: true,
        banner: '#!/usr/bin/env node',
      },
    },
  },
});
