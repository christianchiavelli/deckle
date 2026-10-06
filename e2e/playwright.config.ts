import { defineConfig, devices } from '@playwright/test';

/**
 * Checks only a browser can make, run against the stack `docker compose up` starts,
 * so they test the images as published rather than the source. Start the stack first.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
});
