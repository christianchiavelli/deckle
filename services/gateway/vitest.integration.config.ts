import { defineConfig } from 'vitest/config';
import unit from './vitest.config.js';

/**
 * The specs that need a real Postgres 18, one Testcontainers server per test.
 * They need Docker, so they stay out of `pnpm test`. Spread rather than
 * `mergeConfig`, which would concatenate the unit config's include and exclude.
 */
export default defineConfig({
  ...unit,
  test: {
    ...unit.test,
    include: ['src/**/*.integration.spec.ts'],
    exclude: [],
    // A cold machine pulls the image before the first container starts.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
