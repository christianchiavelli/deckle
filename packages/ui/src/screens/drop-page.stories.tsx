import preview from '#storybook/preview';
import { expect } from 'storybook/test';
import { DropPage } from './drop-page.tsx';

const meta = preview.meta({
  title: 'Screens/Drop page',
  // A whole page per story: a docs page stacking them all would only be slow.
  tags: ['!autodocs'],
  component: DropPage,
  parameters: { bleed: true },
  args: { state: 'open' as const },
});

/** Open: the copies as they stand, and the one action, claiming. */
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

/** Three days before: the countdown, and getting a passkey ready. */
export const Soon = meta.story({
  args: { state: 'soon' },
  globals: { theme: 'light', viewport: { value: 'desktop' } },
});

/** Copy 7 is held for this reader: ten minutes to pay, counted down. */
export const HeldForYou = meta.story({
  args: { state: 'held' },
  globals: { theme: 'light', viewport: { value: 'desktop' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Copy 7 of 50');
    await expect(canvas.getByRole('timer')).toHaveAccessibleName(
      '9 minutes and 42 seconds left to pay',
    );
    await expect(canvas.getByText('7, yours')).toBeInTheDocument();
  },
});

export const HeldForYouPhone = meta.story({
  args: { state: 'held' },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
});

/** "Claim a copy" while signed out: a passkey first, made here or used again. */
export const SignIn = meta.story({
  args: { signIn: 'ask' },
  globals: { theme: 'light', viewport: { value: 'desktop' } },
  play: async ({ canvas }) => {
    const dialog = await canvas.findByRole('dialog', { name: 'Claim with a passkey' });
    await expect(dialog).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Use my passkey' })).toHaveFocus();
  },
});

/** The device's own prompt is up: both ways wait, and the dialog says so. */
export const SignInWaitingPhoneDark = meta.story({
  args: { signIn: 'waiting' },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
});

/** The device gave up, or there was no passkey for Deckle on it. */
export const SignInFailed = meta.story({
  args: { signIn: 'failed' },
  globals: { theme: 'light', viewport: { value: 'phone' } },
});
