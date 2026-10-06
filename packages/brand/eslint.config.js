import { base, restrictImports } from '@deckle/eslint-config';

export default [
  ...base,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts'],
    rules: {
      // The store's pages and both admin panels draw the mark, in the browser too.
      'no-restricted-imports': restrictImports({
        group: ['node:*'],
        message: 'The brand is drawn in browsers as well as on the server: no Node, no I/O.',
      }),
    },
  },
];
