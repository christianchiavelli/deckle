import preview from '#storybook/preview';
import { useState } from 'react';
import { expect } from 'storybook/test';
import { Quantity } from './quantity.tsx';

const meta = preview.meta({
  title: 'Components/Quantity',
  component: Quantity,
  args: {
    value: 2,
    label: 'How many of Melencolia I, A3',
    fewer: 'One fewer',
    more: 'One more',
  },
});

export const Default = meta.story();

/** At one, one fewer is no choice: removing the line is. */
export const AtTheLeast = meta.story({ args: { value: 1 } });

/** While a change is on its way to the cart, both buttons wait. */
export const Busy = meta.story({ args: { busy: true } });

/** One more, then one fewer: the count follows, and is read out as it changes. */
export const Counting = meta.story({
  globals: { theme: 'light' },
  render: (args) => {
    const [value, setValue] = useState(1);
    return <Quantity {...args} value={value} onChange={setValue} />;
  },
  play: async ({ canvas, userEvent }) => {
    const fewer = canvas.getByRole('button', { name: 'One fewer' });
    await expect(fewer).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'One more' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('2');
    await expect(fewer).toBeEnabled();
  },
});
