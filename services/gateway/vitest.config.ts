import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Nest resolves a constructor's dependencies from the `design:paramtypes` metadata
  // that TypeScript's legacy decorators record. Vite 8 compiles TypeScript with Oxc,
  // which emits that metadata when asked, so the suite needs no SWC plugin.
  oxc: { decorator: { legacy: true, emitDecoratorMetadata: true } },
  resolve: {
    // graphql 16 has no exports map: Node loads its CommonJS `main`, and so do Nest
    // and Apollo, while Vite would pick the ESM `module` build for this package's
    // sources. Two copies break graphql's instanceof checks, so both get `main`.
    alias: [{ find: /^graphql$/, replacement: 'graphql/index.js' }],
  },
  test: {
    include: ['src/**/*.spec.ts'],
    exclude: ['src/**/*.integration.spec.ts'],
    setupFiles: ['test/setup.ts'],
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Entry points: CI runs the schema CLI as `schema:check`, and boots main.ts in the image.
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/graphql/schema-cli.ts'],
      // What the suite reached: raise them as it grows, never lower them. Most of the
      // rest is the Postgres code, which test:integration covers against a real one.
      thresholds: { statements: 87, branches: 77, functions: 87, lines: 88 },
    },
  },
});
