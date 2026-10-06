import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/build.ts', 'src/**/*.spec.ts'],
      // The branches left uncovered are the `?? ''` fallbacks noUncheckedIndexedAccess asks for
      // on token paths the parser guarantees, which no token file can reach.
      thresholds: { lines: 100, branches: 90, functions: 100, statements: 100 },
    },
  },
});
