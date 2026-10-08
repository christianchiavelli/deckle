// @ts-check
import { base, restrictImports, tokenRules } from '@deckle/eslint-config';
import reactHooks from 'eslint-plugin-react-hooks';

const framework = ['next', 'next/**', 'react', 'react-dom', 'react/**', 'styled-components'];

/** Modules that state a rule or a contract and nothing else: no framework, so they test alone. */
const pure = ['src/env.ts', 'src/cache/**/*.ts', 'src/views/**/*.ts', 'src/gateway/request.ts'];

/** The browser's GraphQL client, its socket and the passkey ceremonies: the islands' alone. */
const browserOnly = {
  group: ['@apollo/client', '@apollo/client/**', 'graphql-ws', '@simplewebauthn/browser'],
  message:
    'Apollo, its socket and the passkey ceremonies live in src/live; use an island from there.',
};

export default [
  ...base,
  {
    // Written by Next and by GraphQL Codegen.
    ignores: ['.next/', 'next-env.d.ts', 'src/gateway/generated.ts', 'src/live/generated.ts'],
  },
  reactHooks.configs.flat['recommended-latest'],
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // Every token comes through the typed module, as in the design system.
      'no-restricted-syntax': ['error', ...tokenRules.typed],
    },
  },
  {
    files: pure,
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': restrictImports(
        {
          group: framework,
          message:
            'Rules and contracts stay framework-free; use them from src/app or src/components.',
        },
        browserOnly,
      ),
    },
  },
  {
    // Pages reach the gateway only through the cached reads, which tag what they return.
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictImports(
        {
          group: ['**/gateway/request', '**/gateway/request.ts'],
          message:
            'Read through src/gateway/reads.ts: an untagged read would outlive every change.',
        },
        browserOnly,
      ),
    },
  },
  {
    // The islands run in the browser, as this visitor: the server's cached reads are not theirs.
    files: ['src/live/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictImports({
        group: ['**/gateway/reads', '**/gateway/reads.ts', '**/gateway/request', '**/server-env'],
        message:
          'An island reads through Apollo in the browser; the server reads in src/gateway are not for it.',
      }),
    },
  },
];
