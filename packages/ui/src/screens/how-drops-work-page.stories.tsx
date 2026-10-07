import preview from '#storybook/preview';
import { HowDropsWorkPage } from './how-drops-work-page.tsx';

const meta = preview.meta({
  title: 'Screens/How drops work',
  // A whole page per story: a docs page stacking them all would only be slow.
  tags: ['!autodocs'],
  component: HowDropsWorkPage,
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
