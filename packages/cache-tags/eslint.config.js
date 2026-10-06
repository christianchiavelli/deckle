import { base, restrictImports } from '@deckle/eslint-config';

export default [
  ...base,
  {
    files: ['src/**/*.ts'],
    rules: {
      // The gateway and the store both load it; it is words, not I/O.
      'no-restricted-imports': restrictImports({
        group: ['node:*'],
        message: 'The tag vocabulary is plain strings: no Node, no I/O.',
      }),
    },
  },
];
