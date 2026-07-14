import js from '@eslint/js';
import ts from 'typescript-eslint';

export default ts.config(
  {
    ignores: [
      'dist/**',
      'dist-e2e/**',
      'public/**',
      'playwright-report/**',
      'test-results/**',
      // Generated single-file bundles (committed for git-based distribution).
      'bin/**',
      'integrations/claude-code/promptly/engine/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: { Buffer: 'readonly', process: 'readonly', console: 'readonly', URL: 'readonly' },
    },
  },
);
