import preview from '#storybook/preview';
import { expect } from 'storybook/test';
import type React from 'react';
import { suggestFromDataSet } from '../../screens/suggest.ts';
import { SearchField } from './search-field.tsx';

const meta = preview.meta({
  title: 'Components/Search field',
  component: SearchField,
  // Side by side, the same landmark is drawn once per theme; the screens check it is unique.
  parameters: { a11y: { config: { rules: [{ id: 'landmark-unique', enabled: false }] } } },
  args: {
    action: '/search',
    label: 'Search',
    placeholder: 'Search prints, artists and techniques',
    shortcut: '/',
  },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '26rem' }}>
        <Story />
      </div>
    ),
  ],
});

export const Default = meta.story();

/** Focused, the field lifts to the page and its border turns copper. */
export const Typing = meta.story({
  globals: { theme: 'light' },
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole('searchbox', { name: 'Search' });
    await userEvent.type(field, 'Hokusai');
    await expect(field).toHaveValue('Hokusai');
    await expect(canvas.getByRole('search')).toBeInTheDocument();
  },
});

/** The key the hint shows focuses the field from anywhere on the page, and is not typed into it. */
export const Shortcut = meta.story({
  globals: { theme: 'light' },
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole('searchbox', { name: 'Search' });
    await userEvent.keyboard('/');
    await expect(field).toHaveFocus();
    await expect(field).toHaveValue('');
  },
});

/** Room under the field for the list of suggestions, which lies over the page. */
const roomForSuggestions = (Story: () => React.ReactNode) => (
  <div style={{ minBlockSize: '36rem' }}>
    <Story />
  </div>
);

const suggest = { source: suggestFromDataSet, label: 'Suggestions' };

/**
 * As one types, the makers, techniques and prints that start with it, the
 * typed part in bold. The arrow keys move through them with focus still in
 * the field, and Enter opens the one reached.
 */
export const Suggesting = meta.story({
  args: { suggest },
  decorators: [roomForSuggestions],
  globals: { theme: 'light' },
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole('combobox', { name: 'Search' });
    await userEvent.type(field, 'dur');
    const maker = await canvas.findByRole('option', { name: 'Albrecht Dürer 4 prints' });
    await expect(field).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('group', { name: 'Artists' })).toBeVisible();
    await expect(canvas.getByRole('group', { name: 'Prints' })).toBeVisible();
    await expect(canvas.getByRole('option', { name: /All 4 prints for “dur”/ })).toHaveAttribute(
      'href',
      '/search?q=dur',
    );

    await userEvent.keyboard('{ArrowDown}');
    await expect(maker).toHaveAttribute('aria-selected', 'true');
    await expect(field).toHaveAttribute('aria-activedescendant', maker.id);
  },
});

export const SuggestingDark = meta.story({
  args: { suggest },
  decorators: [roomForSuggestions],
  globals: { theme: 'dark' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole('combobox', { name: 'Search' }), 'etch');
    await expect(await canvas.findByRole('option', { name: /Etchings/ })).toBeVisible();
  },
});

/** Nothing starts with what was typed: the field says so, and Enter still searches. */
export const NothingToSuggest = meta.story({
  args: { suggest },
  decorators: [roomForSuggestions],
  globals: { theme: 'light' },
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole('combobox', { name: 'Search' });
    await userEvent.type(field, 'monet');
    await expect(
      await canvas.findByText('No prints, artists or techniques match “monet”'),
    ).toBeVisible();
    await expect(field).toHaveAttribute('aria-expanded', 'false');
  },
});

/** Escape closes the list, and a second Escape clears the field. */
export const Dismissing = meta.story({
  args: { suggest },
  decorators: [roomForSuggestions],
  globals: { theme: 'light' },
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole('combobox', { name: 'Search' });
    await userEvent.type(field, 'hok');
    await canvas.findByRole('option', { name: /^Katsushika Hokusai \d+ prints$/ });
    await userEvent.keyboard('{ArrowUp}');
    await expect(field).toHaveAttribute('aria-activedescendant');
    await userEvent.keyboard('{Escape}');
    await expect(field).toHaveAttribute('aria-expanded', 'false');
    await expect(field).toHaveValue('hok');
    await userEvent.keyboard('{Escape}');
    await expect(field).toHaveValue('');
  },
});
