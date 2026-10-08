import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The load test itself runs in k6; only what it is built from runs here.
    include: ['support/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['support/**/*.ts'],
      exclude: ['support/**/*.spec.ts'],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
