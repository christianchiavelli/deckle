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

export const total = list.length;

/** Every work, oldest first: the catalogue reads as a short history of the print. */
export const allWorks = [...list].sort(
  (a, b) => a.date.beginYear - b.date.beginYear || a.shortTitle.localeCompare(b.shortTitle, LOCALE),
);

/**
 * A work's technique, as a buyer would look for it: the medium's first
 * process, so "Etching, aquatint" is an etching and "Diptych of woodblock
 * prints" a woodblock print. The first pattern that matches wins.
 */
const TECHNIQUES: readonly (readonly [string, RegExp])[] = [
  ['Woodblock prints', /woodblock/i],
  ['Woodcuts', /woodcut/i],
  ['Lithographs', /lithograph|zincograph/i],
  ['Engravings', /^engraving/i],
  ['Etchings', /^etching/i],
  ['Mezzotints', /^mezzotint/i],
  ['Drypoints', /^drypoint/i],
  ['Aquatints', /aquatint/i],
];

export function techniqueOf(entry: Work): string {
  const found = TECHNIQUES.find(([, pattern]) => pattern.test(entry.medium));
  if (!found) {
    throw new Error(`No technique for the medium of ${entry.slug}: ${entry.medium}`);
  }
  return found[0];
}

/** "16th century", from the year the work was begun. */
export function centuryOf(entry: Work): string {
  const century = Math.floor(entry.date.beginYear / 100) + 1;
  return `${String(century)}th century`;
}

/** Each value and how many works have it, most first, then by name. */
export function tally(values: readonly string[]): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, LOCALE));
}

/** The largest size a work is sold at. */
export const largestOf = (entry: Work) =>
  optionsOf(entry)
    .filter((option) => option.available)
    .at(-1)?.size ?? null;

/** The editor's collections, as the CMS seeds them; the front page's own selection is not one. */
export const curations = [
  {
    title: 'Dürer in copper and wood',
    slug: 'durer-in-copper-and-wood',
    intro: 'Three engravings from 1513 and 1514, and the woodcut of a rhinoceros Dürer never saw.',
    works: [
      'knight-death-and-the-devil',
      'melencolia-i',
      'saint-jerome-in-his-study',
      'the-rhinoceros',
    ],
  },
  {
    title: 'Monsters and dreams',
    slug: 'monsters-and-dreams',
    intro:
      'Demons, witches, a giant and the monsters of sleep, from Schongauer in the 1470s to Redon in 1890.',
    works: [
      'saint-anthony-tormented-by-demons',
      'the-witches',
      'the-sleep-of-reason-produces-monsters',
      'seated-giant',
      'eyes-closed',
    ],
  },
  {
    title: 'Rain, snow and fireworks',
    slug: 'rain-snow-and-fireworks',
    intro:
      'Weather and fireworks in Japanese woodblock prints, from Hiroshige in the 1830s and 1850s to Kiyochika in 1881.',
    works: [
      'evening-snow-at-kanbara',
      'sudden-shower-over-shin-ohashi',
      'fireworks-at-ryogoku-bridge',
      'fireworks-at-ikenohata',
    ],
  },
  {
    title: 'Thirty-six Views of Mount Fuji',
    slug: 'thirty-six-views-of-mount-fuji',
    intro: 'Four of the views Hokusai designed for his series, the Great Wave among them.',
    works: [
      'under-the-wave-off-kanagawa',
      'south-wind-clear-sky',
      'storm-below-mount-fuji',
      'ejiri-in-suruga-province',
    ],
  },
].map((curation) => ({ ...curation, works: curation.works.map(work) }));

export type Curation = (typeof curations)[number];

/**
 * The journal: each story the CMS seeds, by the work it is about, with the
 * detail its card shows. The ledes are the seed's own.
 */
export const stories = [
  {
    work: 'melencolia-i',
    title: 'About the engraving',
    lede: 'Dürer cut Melencolia I into copper in 1514, a year after Knight, Death, and the Devil. With Saint Jerome in His Study, the three are known as his master engravings.',
    detail: { x: 74, y: 22, zoom: 3 },
  },
  {
    work: 'the-rhinoceros',
    title: 'About the woodcut',
    lede: 'Dürer never saw the animal he drew. An Indian rhinoceros reached Lisbon in 1515, the first living one seen in Europe since Roman times, and he worked from a written description and a sketch sent on to Nuremberg.',
    detail: { x: 84, y: 52, zoom: 2.2 },
  },
  {
    work: 'under-the-wave-off-kanagawa',
    title: 'About the print',
    lede: 'Hokusai made the Great Wave around 1830–32 for his series Thirty-six Views of Mount Fuji. The mountain sits small in the distance, framed by the trough of the wave.',
    detail: { x: 30, y: 30, zoom: 1.6 },
  },
  {
    work: 'south-wind-clear-sky',
    title: 'About the print',
    lede: 'Hokusai designed South Wind, Clear Sky, also known as Red Fuji, around 1830–32 for his series Thirty-six Views of Mount Fuji.',
    detail: { x: 55, y: 45, zoom: 1.8 },
  },
  {
    work: 'storm-below-mount-fuji',
    title: 'About the print',
    lede: 'Storm below Mount Fuji is another of the views Hokusai designed around 1830–32 for Thirty-six Views of Mount Fuji.',
    detail: { x: 45, y: 40, zoom: 1.8 },
  },
  {
    work: 'ejiri-in-suruga-province',
    title: 'About the print',
    lede: 'Ejiri in Suruga Province belongs to the same series, Thirty-six Views of Mount Fuji, which Hokusai designed around 1830–32.',
    detail: { x: 30, y: 35, zoom: 1.8 },
  },
  {
    work: 'knight-death-and-the-devil',
    title: 'About the engraving',
    lede: 'Dürer engraved Knight, Death, and the Devil in 1513, the year before Melencolia I.',
    detail: { x: 50, y: 40, zoom: 2.4 },
  },
  {
    work: 'saint-jerome-in-his-study',
    title: 'About the engraving',
    lede: 'Saint Jerome in His Study is dated 1514, the year of Melencolia I.',
    detail: { x: 70, y: 45, zoom: 2.4 },
  },
  {
    work: 'evening-snow-at-kanbara',
    title: 'About the print',
    lede: 'Hiroshige made Evening Snow at Kanbara around 1833–34 for his series Fifty-three Stations of the Tōkaidō.',
    detail: { x: 50, y: 60, zoom: 1.8 },
  },
  {
    work: 'sudden-shower-over-shin-ohashi',
    title: 'About the print',
    lede: 'Sudden Shower over Shin-Ōhashi Bridge and Atake is dated 1857, one of Hiroshige’s One Hundred Famous Views of Edo.',
    detail: { x: 50, y: 70, zoom: 2 },
  },
  {
    work: 'fireworks-at-ryogoku-bridge',
    title: 'About the print',
    lede: 'Hiroshige’s Fireworks at Ryōgoku Bridge is dated 1858, from the same series, One Hundred Famous Views of Edo.',
    detail: { x: 50, y: 30, zoom: 1.8 },
  },
  {
    work: 'fireworks-at-ikenohata',
    title: 'About the print',
    lede: 'Kobayashi Kiyochika, who lived from 1847 to 1915, made Fireworks at Ikenohata in 1881, the fourteenth year of the Meiji era.',
    detail: { x: 50, y: 35, zoom: 1.8 },
  },
].map((story) => ({ ...story, work: work(story.work) }));
