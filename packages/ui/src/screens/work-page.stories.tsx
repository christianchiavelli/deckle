import preview from '#storybook/preview';
import { expect } from 'storybook/test';
import { WorkPage } from './work-page.tsx';

const meta = preview.meta({
  title: 'Screens/Work page',
  // A whole page per story: a docs page stacking them all would only be slow.
  tags: ['!autodocs'],
  component: WorkPage,
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

/** On a phone the shop's links open as a sheet, without a script: the Popover API. */
export const PhoneMenu = meta.story({
  globals: { theme: 'light', viewport: { value: 'phone' } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Menu' }));
    const close = await canvas.findByRole('button', { name: 'Close the menu' });
    await expect(close).toBeVisible();
    await expect(canvas.getAllByRole('link', { name: /^Drops/ }).at(-1)).toBeVisible();
  },
});

/** Just after "Add to cart": the print, beside the cart it went into, and the two ways on. */
export const DesktopAdded = meta.story({
  args: { added: true },
  globals: { theme: 'light', viewport: { value: 'desktop' } },
});

export const PhoneAddedDark = meta.story({
  args: { added: true },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
});
