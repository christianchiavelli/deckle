import { formatMoney } from '../format.ts';
import { CURRENCY, imageOf, LOCALE, metaOf, PRICES, work, type Work } from './fixtures.ts';

/** A cart as a reader might fill it: one Dürer, and two of Hokusai's wave. */
export interface CartFixtureLine {
  readonly entry: Work;
  readonly size: 'A4' | 'A3' | 'A2';
  readonly quantity: number;
}

/** The Dürer: in a cart at A3, and as the print of a drop's numbered copies. */
export const melencoliaLine: CartFixtureLine = {
  entry: work('melencolia-i'),
  size: 'A3',
  quantity: 1,
};

export const cartFixture: readonly CartFixtureLine[] = [
  melencoliaLine,
  { entry: work('under-the-wave-off-kanagawa'), size: 'A3', quantity: 2 },
];

/** The flat rate commerce charges wherever a tube goes, in cents. */
export const SHIPPING = 1200;

export const money = (cents: number) => formatMoney(cents, CURRENCY, LOCALE);

const unit = (line: CartFixtureLine) => PRICES[line.size] ?? 0;

export const lineOf = (line: CartFixtureLine) => ({
  href: `/prints/${line.entry.slug}`,
  image: imageOf(line.entry),
  title: line.entry.shortTitle,
  meta: metaOf(line.entry),
  size: `${line.size}, unframed · ${money(unit(line))} each`,
  total: money(unit(line) * line.quantity),
});

export const count = (lines: readonly CartFixtureLine[]) =>
  lines.reduce((sum, line) => sum + line.quantity, 0);

export const subtotal = (lines: readonly CartFixtureLine[]) =>
  lines.reduce((sum, line) => sum + unit(line) * line.quantity, 0);

/** The sum as the summary shows it, the total last. */
export const rowsOf = (lines: readonly CartFixtureLine[]) => [
  {
    label: `Subtotal, ${String(count(lines))} prints`,
    value: money(subtotal(lines)),
  },
  { label: 'Shipping, rolled in a tube', value: money(SHIPPING) },
  { label: 'Total', value: money(subtotal(lines) + SHIPPING) },
];
