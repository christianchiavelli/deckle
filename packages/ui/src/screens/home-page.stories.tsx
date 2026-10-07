import preview from '#storybook/preview';
import { HomePage } from './home-page.tsx';

const meta = preview.meta({
  title: 'Screens/Home',
  // A whole page per story: a docs page stacking them all would only be slow.
  tags: ['!autodocs'],
  component: HomePage,
  parameters: { bleed: true },
});

export const Desktop = meta.story({
  globals: { theme: 'light', viewport: { value: 'desktop' } },
});

export const DesktopDark = meta.story({
  globals: { theme: 'dark', viewport: { value: 'desktop' } },
});

export const Phone = meta.story({
  globals: { theme: 'light', viewport: { value: 'phone' } },
});

export const PhoneDark = meta.story({
  globals: { theme: 'dark', viewport: { value: 'phone' } },
});

/** The header's search, suggesting as one types: makers first, then their prints. */
export const DesktopSuggesting = meta.story({
  globals: { theme: 'light', viewport: { value: 'desktop' } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole('combobox', { name: 'Search' }), 'dur');
    await canvas.findByRole('option', { name: 'Albrecht Dürer 4 prints' });
  },
});

export const DesktopSuggestingDark = meta.story({
  globals: { theme: 'dark', viewport: { value: 'desktop' } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole('combobox', { name: 'Search' }), 'etch');
    await canvas.findByRole('option', { name: /^Etchings \d+ prints$/ });
  },
});
