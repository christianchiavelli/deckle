import preview from '#storybook/preview';
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
