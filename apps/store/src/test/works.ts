import { printOptions, type Pixels } from '@deckle/print-sizes';
import type {
  ListedWorkFragment,
  PaperOptionFragment,
  PrintTileFragment,
} from '../gateway/generated';
import type { Work } from '../views/work';

/**
 * Works shaped as the gateway sends them, from The Met's real records and the
 * real sizing rule, so a test reads the numbers a visitor would.
 */

const PRICES = { A4: 5500, A3: 9000, A2: 14000, A1: 21000 } as const;

export function optionsFor(scan: Pixels): PaperOptionFragment[] {
  return printOptions(scan).map((option) => ({
    size: option.size,
    available: option.available,
    ppi: option.ppi,
    requiredPixels: option.requiredPixels,
    unavailableReason: option.available ? null : 'RESOLUTION_TOO_LOW',
    variantId: option.available ? `variant-${option.size}` : null,
    paper: option.paper,
    image: option.image,
    price: option.available ? { amount: PRICES[option.size], currencyCode: 'USD' } : null,
  }));
}

const IMAGES = 'http://localhost:8080/assets/source';

export const melencolia: Work = {
  slug: 'melencolia-i',
  title: 'Melencolia I',
  fullTitle: 'Melencolia I',
  date: '1514',
  technique: 'Engravings',
  medium: 'Engraving',
  dimensions: ['Plate: 9 7/16 × 7 5/16 in. (24 × 18.5 cm)'],
  classification: 'Prints',
  department: 'Drawings and Prints',
  culture: null,
  period: null,
  creditLine: 'Harris Brisbane Dick Fund, 1943',
  accessionNumber: '43.106.1',
  museumUrl: 'https://www.metmuseum.org/art/collection/search/336228',
  artist: {
    name: 'Albrecht Dürer',
    bio: 'German, Nuremberg 1471–1528 Nuremberg',
    nationality: 'German',
    beginYear: 1471,
    endYear: 1528,
  },
  image: {
    url: `${IMAGES}/melencolia-i.webp`,
    width: 1901,
    height: 2400,
    scanWidth: 2820,
    scanHeight: 3561,
  },
  sizes: optionsFor({ width: 2820, height: 3561 }),
  story: null,
};

export const greatWave: Work = {
  ...melencolia,
  slug: 'under-the-wave-off-kanagawa',
  title: 'Under the Wave off Kanagawa',
  date: 'ca. 1830–32',
  technique: 'Woodblock prints',
  medium: 'Woodblock print; ink and color on paper',
  dimensions: ['10 1/8 x 14 15/16 in. (25.7 x 37.9 cm)'],
  department: 'Asian Art',
  culture: 'Japan',
  period: 'Edo period (1615–1868)',
  artist: {
    name: 'Katsushika Hokusai',
    bio: 'Japanese, Tokyo (Edo) 1760–1849 Tokyo (Edo)',
    nationality: 'Japanese',
    beginYear: 1760,
    endYear: 1849,
  },
  image: {
    url: `${IMAGES}/under-the-wave-off-kanagawa.webp`,
    width: 2400,
    height: 1613,
    scanWidth: 3859,
    scanHeight: 2594,
  },
  sizes: optionsFor({ width: 3859, height: 2594 }),
};

/** A work as a tile, from a work. */
export function tileFrom(work: Work): PrintTileFragment {
  const sold = work.sizes.filter((size) => size.available);
  return {
    slug: work.slug,
    title: work.title,
    date: work.date,
    department: work.department,
    artist: work.artist && { name: work.artist.name },
    image: work.image && {
      url: work.image.url,
      width: work.image.width,
      height: work.image.height,
    },
    priceFrom: sold[0]?.price ?? null,
    sizes: work.sizes.map(({ size, available }) => ({ size, available })),
  };
}

/** A work as the catalogue lists it, from a work and the year it was begun. */
export function listedFrom(work: Work, year: number | null): ListedWorkFragment {
  return {
    ...tileFrom(work),
    year,
    technique: work.technique,
    fullTitle: work.fullTitle,
    medium: work.medium,
    culture: work.culture,
  };
}
