import { base, restrictImports } from '@deckle/eslint-config';

const shipped = ['src/**/*.ts'];
const specs = ['src/**/*.spec.ts'];

/** Bans for every module that ships in the image. */
const runtimeBans = [
  {
    group: ['vitest', 'vitest/*', '@vendure/testing', 'testcontainers', '@testcontainers/*'],
    message: 'Test tooling is a dev dependency and is not in the image.',
  },
  {
    group: ['@vendure/*/dist/*'],
    message:
      "Import from the package's entry point: dist paths are internal and move between minors.",
  },
];

const toolsBan = {
  group: ['./tools/*', '../tools/*'],
  message:
    'The tools run at build time on placeholder settings; nothing a running service loads may import them.',
};

export default [
  ...base,
  {
    files: shipped,
    ignores: [...specs, 'src/tools/**'],
    rules: {
      'no-restricted-imports': restrictImports(...runtimeBans, toolsBan),
    },
  },
  {
    files: ['src/tools/**/*.ts'],
    ignores: specs,
    rules: {
      'no-restricted-imports': restrictImports(...runtimeBans),
    },
  },
  {
    files: ['src/plugins/**/*.ts'],
    ignores: specs,
    rules: {
      // A plugin takes everything it needs through init(), so it could move to its own package.
      'no-restricted-imports': restrictImports(...runtimeBans, {
        group: ['../*'],
        message:
          'A plugin imports only from its own folder and packages; pass settings through init().',
      }),
      // A plugin is a decorated class, and empty when the decorator says it all.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
  {
    files: ['src/plugins/*/dashboard/**/*.tsx'],
    rules: {
      'no-restricted-imports': restrictImports({
        group: ['node:*', '@vendure/core', '@vendure/core/*', '../*'],
        message:
          'A dashboard extension runs in the browser, inside the panel: nothing from the server.',
      }),
    },
  },
];
