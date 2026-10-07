import preview from '#storybook/preview';
import { AccountPage } from './account-page.tsx';

const meta = preview.meta({
  title: 'Screens/Account',
  // A whole page per story: a docs page stacking them all would only be slow.
  tags: ['!autodocs'],
  component: AccountPage,
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

/** Signed in: the copy held with this passkey, the way to pay for it, and the way out. */
export const SignedIn = meta.story({
  args: { signedIn: true },
  globals: { theme: 'light', viewport: { value: 'desktop' } },
});

export const SignedInPhoneDark = meta.story({
  args: { signedIn: true },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
});
