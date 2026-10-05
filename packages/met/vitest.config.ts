import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // A `main.ts` only wires the real client and paths to code tested here,
      // and runs against The Met itself; `src/test` is test support.
      exclude: ['src/index.ts', 'src/**/main.ts', 'src/test/**'],
      thresholds: { lines: 99, branches: 92, functions: 98, statements: 98 },
    },
  },
});
