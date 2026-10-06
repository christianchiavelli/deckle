import preview from '#storybook/preview';
import { PrintsPage } from './prints-page.tsx';

const meta = preview.meta({
  title: 'Screens/Prints',
  // A whole page per story: a docs page stacking them all would only be slow.
  tags: ['!autodocs'],
  component: PrintsPage,
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

/** Two choices made: the counts in each group follow the other's choice. */
export const Filtered = meta.story({
  args: { technique: 'Etchings', century: '18th century' },
  globals: { theme: 'light', viewport: { value: 'desktop' } },
});

export const FilteredPhoneDark = meta.story({
  args: { technique: 'Etchings', century: '18th century' },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
});
