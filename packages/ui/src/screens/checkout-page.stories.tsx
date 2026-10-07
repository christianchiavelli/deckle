import preview from '#storybook/preview';
import { CheckoutPage } from './checkout-page.tsx';

const meta = preview.meta({
  title: 'Screens/Checkout',
  // A whole page per story: a docs page stacking them all would only be slow.
  tags: ['!autodocs'],
  component: CheckoutPage,
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

/** After a try with two fields wrong: each says why, in the error's red. */
export const WithErrors = meta.story({
  args: { errors: true },
  globals: { theme: 'light', viewport: { value: 'desktop' } },
});

export const WithErrorsPhoneDark = meta.story({
  args: { errors: true },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
});

/** Paying for a copy held in a drop: the copy alone, shipping included, and its clock beside it. */
export const DropCopy = meta.story({
  args: { drop: true },
  globals: { theme: 'light', viewport: { value: 'desktop' } },
});

export const DropCopyPhoneDark = meta.story({
  args: { drop: true },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
});
