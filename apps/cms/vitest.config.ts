import { defineConfig } from 'vitest/config';

/**
 * Unit tests: the rules and contracts, no database. Anything that needs
 * Postgres is a `*.int.spec.ts` and runs with `test:integration`.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    exclude: ['src/**/*.int.spec.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/env.ts',
        'src/admin/**/*.ts',
        'src/access/**/*.ts',
        'src/fields/**/*.ts',
        'src/preview/**/*.ts',
        'src/rich-text/prose.ts',
        'src/seed/cms-client.ts',
        'src/webhooks/event.ts',
        'src/webhooks/publication.ts',
        'src/webhooks/signature.ts',
        'src/webhooks/deliver.ts',
      ],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
