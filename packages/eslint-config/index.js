// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * The rules every package shares. A package spreads `base` into its own
 * `eslint.config.js` and adds the boundaries between its layers with
 * `restrictImports()`, so a crossing fails the lint instead of a review.
 */
export const base = defineConfig([
  {
    ignores: ['dist/', 'build/', 'coverage/', '.next/', 'node_modules/', '**/*.d.ts'],
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: { projectService: true },
    },
    rules: {
      // Numbers and booleans read fine in a template; objects and nullish values do not.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [eslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Specs may reach into what they test and build loose fixtures.
    files: ['**/*.{spec,test}.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
]);

/**
 * One `no-restricted-imports` rule from a list of bans, each carrying the reason
 * it prints: `{ name }` bans one module, `{ group }` a family of them.
 *
 * @param {...({ name: string, message: string } | { group: string[], message: string })} rules
 */
export function restrictImports(...rules) {
  return /** @type {const} */ ([
    'error',
    {
      paths: rules.filter((rule) => 'name' in rule),
      patterns: rules.filter((rule) => 'group' in rule),
    },
  ]);
}
