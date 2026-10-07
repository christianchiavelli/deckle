import preview from '#storybook/preview';
import { expect } from 'storybook/test';
import { SearchPage } from './search-page.tsx';

const meta = preview.meta({
  title: 'Screens/Search',
  // A whole page per story: a docs page stacking them all would only be slow.
  tags: ['!autodocs'],
  component: SearchPage,
  args: { query: 'Dürer' },
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

/** Nothing found: where to look instead. */
export const NoResults = meta.story({
  args: { query: 'Monet' },
  globals: { theme: 'light', viewport: { value: 'desktop' } },
});

export const NoResultsPhoneDark = meta.story({
  args: { query: 'Monet' },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
});

/** On a phone the header's search icon leads here, and this field suggests as one types. */
export const PhoneSuggesting = meta.story({
  globals: { theme: 'light', viewport: { value: 'phone' } },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const field = canvas.getByRole('combobox', { name: 'Search' });
    await userEvent.clear(field);
    await userEvent.type(field, 'hok');
    await canvas.findByRole('option', { name: /^Katsushika Hokusai \d+ prints$/ });
    // The waterfall is a tall print: it must stay inside its mat like the wide ones.
    for (const picture of canvasElement.querySelectorAll<HTMLImageElement>('[role="option"] img')) {
      await expect(picture.offsetHeight).toBeLessThanOrEqual(
        picture.parentElement?.clientHeight ?? 0,
      );
    }
  },
});

export const PhoneSuggestingDark = meta.story({
  globals: { theme: 'dark', viewport: { value: 'phone' } },
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole('combobox', { name: 'Search' });
    await userEvent.clear(field);
    await userEvent.type(field, 'wave');
    await canvas.findByRole('option', { name: /^Under the Wave off Kanagawa/ });
  },
});
