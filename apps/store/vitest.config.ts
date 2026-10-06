import { defineConfig } from 'vitest/config';

/**
 * Unit tests: the store's rules, with no Next.js and no gateway. What only a
 * browser shows is checked in `e2e`, against the running stack.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/env.ts', 'src/cache/**/*.ts', 'src/views/**/*.ts', 'src/gateway/request.ts'],
      exclude: ['src/**/*.spec.ts'],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
