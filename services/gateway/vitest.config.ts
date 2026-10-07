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
      exclude: [
        'src/**/*.spec.ts',
        // Entry points: CI runs the schema CLI as `schema:check`, and boots main.ts in the image.
        'src/main.ts',
        'src/graphql/schema-cli.ts',
        // The Postgres implementations: only a real Postgres can test them, and
        // test:integration does, in CI, on every push. Here they would only dilute
        // what this suite is asked to reach.
        'src/**/pg-*.ts',
      ],
      // What the suite reached: raise them as it grows, never lower them.
      thresholds: { statements: 95, branches: 82, functions: 95, lines: 96 },
    },
  },
});
