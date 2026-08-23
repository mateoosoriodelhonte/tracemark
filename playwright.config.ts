import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'chromium.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  reporter: 'line',
  outputDir: 'test-results/chromium',
  use: {
    trace: 'retain-on-failure',
  },
});
