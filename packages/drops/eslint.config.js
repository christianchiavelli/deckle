import { base, restrictImports } from '@deckle/eslint-config';

export default [
  ...base,
  {
    files: ['src/**/*.ts'],
    rules: {
      // Three services seed from it; it is facts, not I/O.
      'no-restricted-imports': restrictImports({
        group: ['node:*'],
        message: 'The drops are plain data: no Node, no I/O.',
      }),
    },
  },
];
