import { base, restrictImports } from '@deckle/eslint-config';

const testSupport = {
  group: ['**/test/**'],
  message: 'Production code never imports test support.',
};

export default [
  ...base,
  {
    files: ['**/*.ts'],
    rules: {
      // Nest modules are empty classes that exist for their @Module() metadata.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': restrictImports(
        {
          group: ['drizzle-orm', 'drizzle-orm/*', 'pg'],
          message:
            'Postgres is reached through src/database, the *.table.ts definitions, the stores and the pub/sub; never from resolvers or clients.',
        },
        testSupport,
      ),
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Read configuration through ConfigService: the environment is validated once, in src/config.',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'Call other services through src/upstream, which sets deadlines and types the failures.',
        },
      ],
    },
  },
  {
    // The persistence layer: the only code that talks to Postgres.
    files: [
      'src/database/**/*.ts',
      'src/pubsub/pg-pubsub.ts',
      'src/**/*.table.ts',
      'src/**/pg-*.ts',
      'src/identity/signing-key.store.ts',
      'src/health/health.indicators.ts',
    ],
    rules: { 'no-restricted-imports': restrictImports(testSupport) },
  },
  {
    // Specs set up what they test, Postgres and the environment included.
    files: ['src/**/*.spec.ts'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-properties': 'off',
      'no-restricted-globals': 'off',
    },
  },
  {
    // The entry point picks the log format before the environment is validated.
    files: ['src/main.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    files: ['src/upstream/http.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
];
