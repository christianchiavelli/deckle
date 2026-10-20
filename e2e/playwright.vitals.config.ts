import { defineConfig } from '@playwright/test';

/**
 * The Core Web Vitals of the store, through Caddy, on the phone and connection
 * of Lighthouse's mobile run, against the stack `docker compose up --wait`
 * started. Each page's median is held against the last accepted measurement
 * (`vitals/baseline.json`).
 *
 * One visit at a time, and nothing recorded on the side: a measurement
 * shares the machine with nothing, not even a trace of itself.
 */
export default defineConfig({
  testDir: './vitals',
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env['CI']),
  // A measurement retried until it passes measures nothing.
  retries: 0,
  timeout: 10 * 60_000,
  // Four times slower, on slow 4G, a page takes longer to answer than the suite's default allows.
  expect: { timeout: 20_000 },
  reporter: [[process.env['CI'] ? 'github' : 'list'], ['./vitals/reporter.ts']],
  use: {
    baseURL: process.env['STORE_URL'] ?? 'http://localhost:8080',
    // Chrome itself, headless, rather than the lighter shell: it paints the way Chrome does.
    channel: 'chromium',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    // A tap that finds nothing to tap fails within a minute, not at the end of the visit.
    actionTimeout: 60_000,
  },
});
