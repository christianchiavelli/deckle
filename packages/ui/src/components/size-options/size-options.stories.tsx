import { printOptions } from '@deckle/print-sizes';
import preview from '#storybook/preview';
import { expect, fn } from 'storybook/test';
import { Note } from '../note/note.tsx';
import { TextLink } from '../text-link/text-link.tsx';
import { type SizeOption, SizeOptions } from './size-options.tsx';

/** Melencolia I: The Met's scan is 2,820 × 3,561 px, so A2 and A1 are out of reach. */
const melencolia = { width: 2820, height: 3561 };
const prices: Record<string, number> = { A4: 5500, A3: 9000, A2: 14500, A1: 21000 };

const sizesFor = (scan: { width: number; height: number }): SizeOption[] =>
  printOptions(scan).map((option) => ({ ...option, price: prices[option.size] ?? null }));

const meta = preview.meta({
  title: 'Components/Size options',
  component: SizeOptions,
  args: {
    name: 'size',
    legend: 'Size',
    options: sizesFor(melencolia),
    defaultValue: 'A3',
    currency: 'USD',
    locale: 'en-US',
    unavailable: 'Scan too small',
    missingPrice: 'Price not set',
    help: <TextLink href="#sizing">How we size prints</TextLink>,
    note: (
      <Note>
        A2 would need 3,213 px across the image. The Met’s scan has 2,820, and we never upscale.
      </Note>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '32rem' }}>
        <Story />
      </div>
    ),
  ],
});

/** As on the work's page: the two sizes the scan can print, and the two it cannot. */
export const Default = meta.story();

const portuguese = {
  legend: 'Tamanho',
  locale: 'pt-BR',
  unavailable: 'Resolução insuficiente',
  missingPrice: 'Preço não definido',
  help: <TextLink href="#sizing">Como definimos os tamanhos</TextLink>,
  note: (
    <Note>
      O A2 precisaria de 3.213 px de largura. A digitalização do Met tem 2.820, e nunca ampliamos a
      imagem.
    </Note>
  ),
};

/** The same work for a reader in Brazil: dollars written the Brazilian way, decimal commas. */
export const Portuguese = meta.story({ args: portuguese });

/** On a phone, 343 px across: the chip drops under the sheet's size rather than squeeze it. */
export const PhoneWidth = meta.story({
  args: portuguese,
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '21.4375rem' }}>
        <Story />
      </div>
    ),
  ],
});

/** A scan large enough for every size, so nothing is out of reach and there is nothing to explain. */
export const EverySize = meta.story({
  args: { options: sizesFor({ width: 7200, height: 9100 }), note: undefined },
});

/** Commerce has no price for A4 yet: a dash, never a zero, and words for a screen reader. */
export const MissingPrice = meta.story({
  args: {
    options: sizesFor(melencolia).map((option) =>
      option.size === 'A4' ? { ...option, price: null } : option,
    ),
  },
});

/** Choosing with the pointer; the sizes the scan cannot reach stay out of the choice. */
export const Choosing = meta.story({
  globals: { theme: 'light' },
  args: { onValueChange: fn() },
  play: async ({ args, canvas, userEvent }) => {
    const a4 = canvas.getByRole('radio', { name: /^A4/ });
    await userEvent.click(a4);
    await expect(a4).toBeChecked();
    await expect(args.onValueChange).toHaveBeenCalledWith('A4');

    await expect(canvas.getByRole('radio', { name: /^A2/ })).toBeDisabled();
    await expect(canvas.getByRole('group', { name: 'Size' })).toHaveAccessibleDescription(
      /we never upscale/,
    );
  },
});

/** With the keyboard: arrows move between the sizes that can be chosen and skip the rest. */
export const Keyboard = meta.story({
  globals: { theme: 'light' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('link', { name: 'How we size prints' })).toHaveFocus();
    // Into the group, Tab lands on the chosen size, not the first one.
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: /^A3/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(canvas.getByRole('radio', { name: /^A4/ })).toBeChecked();
  },
});
