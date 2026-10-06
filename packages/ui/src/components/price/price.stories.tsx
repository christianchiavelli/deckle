import preview from '#storybook/preview';
import { expect } from 'storybook/test';
import { Price } from './price.tsx';

const meta = preview.meta({
  title: 'Components/Price',
  component: Price,
  args: {
    amount: 9000,
    currency: 'USD',
    locale: 'en-US',
    missing: 'Price not set',
    children: 'A3, unframed',
  },
});

/** Whole dollars drop their cents, as a price tag does. */
export const Default = meta.story();

/** In Portuguese the store still sells in dollars, written the Brazilian way. */
export const Portuguese = meta.story({
  args: { locale: 'pt-BR', missing: 'Preço não definido', children: 'A3, sem moldura' },
});

/** With cents, they show. */
export const WithCents = meta.story({ args: { amount: 5550 } });

/** Commerce has no price: a dash on screen, never a zero, and words for a screen reader. */
export const Missing = meta.story({
  globals: { theme: 'light' },
  args: { amount: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('—')).toBeVisible();
    await expect(canvas.queryByText(/\$0/)).toBeNull();
    await expect(canvas.getByText('Price not set')).toBeInTheDocument();
  },
});
