// @ts-check
import { base, tokenRules } from '@deckle/eslint-config';
import reactHooks from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';

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
      'no-restricted-syntax': ['error', ...tokenRules.themed],
    },
  },
  {
    // Components, sections and screens go further: every token comes through the typed module.
    files: ['src/components/**/*.tsx', 'src/sections/**/*.tsx', 'src/screens/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...tokenRules.typed],
    },
  },
];
