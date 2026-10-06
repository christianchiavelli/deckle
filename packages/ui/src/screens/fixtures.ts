/**
 * The screens are drawn with the real data set: the works The Met's importer
 * wrote, sized by the same rule the store sells by. Prices are the store's
 * list, in cents. Nothing here is fetched; Storybook serves the images.
 */
import { printOptions, type PrintOption } from '@deckle/print-sizes';
import catalog from '../../../../data/met/catalog.json';
import { formatMoney } from '../format.ts';

export type Work = (typeof catalog.works)[number];

const list = catalog.works;

export const PRICES: Readonly<Record<string, number>> = {
  A4: 5500,
  A3: 9000,
  A2: 14500,
  A1: 21000,
};

export const LOCALE = 'en-US';
export const CURRENCY = 'USD';

export function work(slug: string): Work {
  const found = list.find((entry) => entry.slug === slug);
  if (!found) {
    throw new Error(`No work ${slug} in data/met/catalog.json`);
  }
  return found;
}

export const imageOf = (entry: Work) => ({
  src: `/met/${entry.image.file}`,
  width: entry.image.width,
  height: entry.image.height,
});

export const scanOf = (entry: Work) => ({
  width: entry.image.originalWidth,
  height: entry.image.originalHeight,
});

export const optionsOf = (entry: Work): PrintOption[] => printOptions(scanOf(entry));

export const sizesOf = (entry: Work) =>
  optionsOf(entry).map((option) => ({ ...option, price: PRICES[option.size] ?? null }));

/** "From $55", or "$55" and the one size there is. */
export function priceLine(entry: Work): { amount: string; only: string | null } {
  const available = optionsOf(entry).filter((option) => option.available);
  const smallest = available[0];
  const amount = formatMoney(smallest ? (PRICES[smallest.size] ?? null) : null, CURRENCY, LOCALE);
  return available.length === 1 && smallest
    ? { amount, only: `${smallest.size} only` }
    : { amount: `From ${amount}`, only: null };
}

/** "German, 1471–1528", from the record's nationality and years. */
export const lifeOf = (entry: Work) =>
  [entry.artist.nationality, `${entry.artist.beginYear}–${entry.artist.endYear}`]
    .filter(Boolean)
    .join(', ');

/** "Plate 24 × 18.5 cm", out of the museum's "Plate: 9 7/16 × 7 5/16 in. (24 × 18.5 cm)". */
export function sizeOfOriginal(entry: Work): string | null {
  const match = /^(?<part>[^:]+): .*\((?<cm>[^)]+cm)\)/.exec(entry.dimensions[0] ?? '');
  return match?.groups ? `${match.groups['part']} ${match.groups['cm']}` : null;
}

export const factsOf = (entry: Work) =>
  [entry.date.display, entry.medium, sizeOfOriginal(entry)].filter(Boolean).join(' · ');

export const metaOf = (entry: Work) => `${entry.artist.name}, ${entry.date.display}`;

export const pixels = (value: number) => new Intl.NumberFormat(LOCALE).format(value);

/** Works by department or technique, for the home page's collections. */
export const collections = [
  {
    title: 'Japanese woodblock prints',
    slug: 'japanese-woodblock-prints',
    works: list.filter((entry) => entry.department === 'Asian Art'),
  },
  {
    title: 'Engravings',
    slug: 'engravings',
    works: list.filter((entry) => entry.medium.startsWith('Engraving')),
  },
  {
    title: 'Etchings',
    slug: 'etchings',
    works: list.filter((entry) => entry.medium.startsWith('Etching')),
  },
];

export const total = list.length;
