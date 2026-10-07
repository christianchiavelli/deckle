import preview from '#storybook/preview';
import { CartPage } from './cart-page.tsx';

const meta = preview.meta({
  title: 'Screens/Cart',
  // A whole page per story: a docs page stacking them all would only be slow.
  tags: ['!autodocs'],
  component: CartPage,
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

/** Nothing in it yet: the way back to the prints. */
export const Empty = meta.story({
  args: { empty: true },
  globals: { theme: 'light', viewport: { value: 'desktop' } },
});

export const EmptyPhoneDark = meta.story({
  args: { empty: true },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
});
