import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  webServer: {
    command: 'node scripts/fixture-server.mjs',
    port: 4173,
    reuseExistingServer: true,
  },
});
