/**
 * How the store writes money and measures, in the reader's locale. Pure
 * functions, so a component formats the same way on the server and in the
 * browser, and the rules are tested without rendering anything.
 */

/** What a reader shows for a value the source does not have: a dash, never a zero. */
export const MISSING = '—';

/**
 * A price in minor units, as commerce keeps it: Vendure's default money
 * strategy stores every amount with two decimal places. Whole amounts drop
 * their cents, as price tags do: $90, not $90.00.
 */
export function formatMoney(minor: number | null, currency: string, locale: string): string {
  if (minor === null) {
    return MISSING;
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    trailingZeroDisplay: 'stripIfInteger',
  }).format(minor / 100);
}

export interface Centimetres {
  readonly width: number;
  readonly height: number;
}

/** A sheet or an image, width by height: `29.7 × 42 cm`, or `29,7 × 42 cm` in Portuguese. */
export function formatCentimetres({ width, height }: Centimetres, locale: string): string {
  const side = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const last = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'centimeter',
    maximumFractionDigits: 1,
  });
  return `${side.format(width)} × ${last.format(height)}`;
}

/** Pixels per inch. Not a unit `Intl` knows, and written the same in English and Portuguese. */
export function formatPpi(ppi: number, locale: string): string {
  return `${new Intl.NumberFormat(locale).format(ppi)} ppi`;
}
