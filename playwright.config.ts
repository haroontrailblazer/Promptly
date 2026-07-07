import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  webServer: {
    command: 'node scripts/fixture-server.mjs',
    port: 4173,
    // Reuse a dev server locally, but fail fast on a stale port squatter in CI.
    reuseExistingServer: !process.env.CI,
  },
});
