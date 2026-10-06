import preview from '#storybook/preview';
import { expect, fn } from 'storybook/test';
import { Button, ButtonLink } from './button.tsx';

const meta = preview.meta({
  title: 'Components/Button',
  component: Button,
  args: { children: 'Add to cart', icon: 'bag', onClick: fn() },
});

/** The one action a screen leads to, in the ink of the page. */
export const Primary = meta.story();

/** The drop's copper: for what opens, counts down or is numbered. */
export const Accent = meta.story({
  args: { variant: 'accent', children: 'Claim a copy', icon: 'key' },
});

/** Nothing left to buy: the button stays, says why, and cannot be pressed. */
export const Disabled = meta.story({
  args: { children: 'Sold out', icon: undefined, disabled: true },
});

/** Goes somewhere, so it is a link drawn as a button. */
export const Link = meta.story({
  render: () => (
    <ButtonLink href="#drop" variant="accent" icon="key">
      Join with a passkey
    </ButtonLink>
  ),
});

export const Pressing = meta.story({
  globals: { theme: 'light' },
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Add to cart' });
    await expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});
