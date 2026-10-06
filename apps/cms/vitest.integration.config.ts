import { defineConfig } from 'vitest/config';

/**
 * Integration tests: Payload against a real Postgres 18 in Testcontainers,
 * started the way the production server starts it. Needs Docker.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.int.spec.ts'],
    // Each file gets its own process, so its own Payload instance and container.
    pool: 'forks',
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});
