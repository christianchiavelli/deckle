import { tokens as t } from '@deckle/tokens';
import preview from '#storybook/preview';
import { expect } from 'storybook/test';
import { IconButton, IconLink } from './icon-button.tsx';

const meta = preview.meta({
  title: 'Components/Icon button',
  component: IconButton,
  args: { icon: 'theme' as const, label: 'Theme' },
});

export const Default = meta.story();

/** The header's tools, as they sit together. The cart is a page, so it is a link. */
export const HeaderTools = meta.story({
  render: () => (
    <div style={{ display: 'flex', gap: t.space.gap2xs }}>
      <IconButton icon="theme" label="Theme" />
      <IconButton icon="user" label="Sign in with a passkey" />
      <IconLink icon="bag" label="Cart, 1 print" href="#cart" badge={1} />
    </div>
  ),
});

/** An empty cart draws no badge: a zero says nothing a bag alone does not. */
export const EmptyCart = meta.story({
  render: () => <IconLink icon="bag" label="Cart, empty" href="#cart" badge={0} />,
});

export const Named = meta.story({
  globals: { theme: 'light' },
  render: () => <IconLink icon="bag" label="Cart, 2 prints" href="#cart" badge={2} />,
  play: async ({ canvas }) => {
    // The badge is drawn for the eye; the name already says it.
    await expect(canvas.getByRole('link', { name: 'Cart, 2 prints' })).toBeVisible();
  },
});
