import { base, restrictImports } from '@deckle/eslint-config';

export default [
  ...base,
  {
    files: ['src/**/*.ts'],
    rules: {
      // The store, the gateway and the importer all size prints with this, the browser included.
      'no-restricted-imports': restrictImports({
        group: ['node:*'],
        message: 'Print sizing is plain arithmetic: no Node, no I/O.',
      }),
    },
  },
];
