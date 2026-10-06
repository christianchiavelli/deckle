import { defineConfig } from 'vitest/config';

/**
 * `test:integration`: Vendure against Postgres 18 in Testcontainers, so it needs
 * Docker. Kept out of `pnpm test`, which has to run anywhere.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts'],
    // Vendure reads this from the process environment itself, not from the config.
    env: { VENDURE_DISABLE_TELEMETRY: 'true' },
    // Each file starts its own Postgres and Vendure; one at a time keeps a laptop usable.
    fileParallelism: false,
    // Pulling the image on a cold machine and bootstrapping Vendure take a while.
    hookTimeout: 240_000,
    testTimeout: 60_000,
  },
});
