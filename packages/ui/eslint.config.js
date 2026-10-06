// @ts-check
import { base } from '@deckle/eslint-config';
import reactHooks from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';

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

const handWrittenVariables = banInStrings(
  '/var\\(--/',
  'Read the token from @deckle/tokens: a typo in tokens.x fails the build, a typo in var() fails silently.',
);

export default [
  ...base,
  {
    ignores: ['storybook-static/'],
  },
  reactHooks.configs.flat['recommended-latest'],
  ...storybook.configs['flat/recommended'],
  {
    // Storybook's chrome reads hex values from the token build; the code itself writes none.
    files: ['src/**/*.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...primitives, ...rawColours],
    },
  },
  {
    // Components go further: every value comes through the typed token module.
    files: ['src/components/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...primitives, ...rawColours, ...handWrittenVariables],
    },
  },
];
