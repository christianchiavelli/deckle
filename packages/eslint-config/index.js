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

/**
 * Bans a pattern in string literals and in the static parts of template
 * literals, which is where styled-components CSS lives.
 *
 * @param {string} pattern an esquery regular expression
 * @param {string} message
 */
function banInStrings(pattern, message) {
  return [
    { selector: `Literal[value=${pattern}]`, message },
    { selector: `TemplateElement[value.raw=${pattern}]`, message },
  ];
}

const primitives = banInStrings(
  '/var\\(--p-/',
  'A primitive skips the semantic layer and the dark theme with it. Read a semantic token from @deckle/tokens.',
);

const rawColours = [
  ...banInStrings(
    '/#[0-9a-fA-F]{3,8}\\b/',
    'A colour written out does not follow the theme. Read a semantic token from @deckle/tokens.',
  ),
  ...banInStrings(
    '/\\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\\(/',
    'A colour written out does not follow the theme. Read a semantic token from @deckle/tokens.',
  ),
];

// A token's variable written by hand. A component's own custom properties, such
// as a print's --ratio, are not tokens and stay allowed.
const handWrittenTokens = banInStrings(
  '/var\\(--(surface|text|icon|stroke|action|accent|focus|feedback|component|type|space|radius|layout|motion)-/',
  'Read the token from @deckle/tokens: a typo in tokens.x fails the build, a typo in var() fails silently.',
);

/**
 * The design tokens' rules, as `no-restricted-syntax` selectors: `themed` bans
 * primitives and colours written out, `typed` also bans a token's variable
 * written by hand, for code where every token comes through the typed module.
 */
export const tokenRules = {
  themed: [...primitives, ...rawColours],
  typed: [...primitives, ...rawColours, ...handWrittenTokens],
};
