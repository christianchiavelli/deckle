import { formatPpi, MISSING } from '@deckle/ui/format';
import type { Copy } from '../copy';
import type { PaperOptionFragment, WorkQuery } from '../gateway/generated';

/** A work as its page reads it. */
export type Work = NonNullable<WorkQuery['artwork']>;
type Artist = Work['artist'];

/** "German, 1471–1528", from the record's nationality and years; a dash for a missing year. */
export function lifeOf(artist: Artist): string {
  if (!artist) {
    return '';
  }
  const years =
    artist.beginYear === null && artist.endYear === null
      ? null
      : `${String(artist.beginYear ?? MISSING)}–${String(artist.endYear ?? MISSING)}`;
  return [artist.nationality, years].filter(Boolean).join(', ');
}

/**
 * The original's size in centimetres, out of the museum's first measurement:
 * "Plate 24 × 18.5 cm" from "Plate: 9 7/16 × 7 5/16 in. (24 × 18.5 cm)", or
 * "25.7 x 37.9 cm" from a measurement that names no part.
 */
export function sizeOfOriginal(dimensions: readonly string[]): string | null {
  const groups = /^(?:(?<part>[^:(]+):\s*)?[^(]*\((?<cm>[^)]+cm)\)/.exec(
    dimensions[0] ?? '',
  )?.groups;
  if (!groups) {
    return null;
  }
  // `cm` always matched when the pattern did; `part` only when the museum named one.
  const cm = String(groups['cm']);
  return groups['part'] === undefined ? cm : `${groups['part']} ${cm}`;
}

/** "1514 · Engraving · Plate 24 × 18.5 cm": what the record says of the original, in one line. */
export function factsOf(work: Pick<Work, 'date' | 'medium' | 'dimensions'>): string {
  return [work.date, work.medium, sizeOfOriginal(work.dimensions)].filter(Boolean).join(' · ');
}

const ORDER = ['A4', 'A3', 'A2', 'A1'] as const;

/** The sizes from A4 up, whatever order they came in. */
export function smallestFirst<T extends Pick<PaperOptionFragment, 'size'>>(
  sizes: readonly T[],
): T[] {
  return [...sizes].sort((a, b) => ORDER.indexOf(a.size) - ORDER.indexOf(b.size));
}

/**
 * The size a page offers first: A3, the one most prints sell in, when it is
 * for sale; otherwise the largest that is. Null when nothing is.
 */
export function defaultSize(sizes: readonly PaperOptionFragment[]): PaperOptionFragment | null {
  const sold = smallestFirst(sizes).filter((size) => size.available);
  return sold.find((size) => size.size === 'A3') ?? sold.at(-1) ?? null;
}

/**
 * Whether the print's width, rather than its height, sets its scale on this
 * sheet: the side left with the narrower margin is the one that ran out of
 * paper first, and so the one the scan needs the most pixels along.
 */
export function limitedAcross(size: Pick<PaperOptionFragment, 'paper' | 'image'>): boolean {
  return size.paper.width - size.image.width <= size.paper.height - size.image.height;
}

/**
 * Why the next size up is missing, when the scan is what stops it: "A2 would
 * need 3,213 px across the image. The Met's scan has 2,820". Null when every
 * size is printed, or when the next one is missing for another reason. A page
 * that has already given the scan's size says it shorter, in its own words.
 */
export function tooSmallNote(
  work: Pick<Work, 'sizes' | 'image'>,
  copy: Copy,
  say: Copy['work']['tooSmall'] = copy.work.tooSmall,
): string | null {
  const first = smallestFirst(work.sizes).find((size) => !size.available);
  if (
    !first ||
    !work.image ||
    first.unavailableReason !== 'RESOLUTION_TOO_LOW' ||
    first.requiredPixels === null
  ) {
    return null;
  }
  const across = limitedAcross(first);
  const pixels = new Intl.NumberFormat(copy.locale);
  return say(
    first.size,
    pixels.format(first.requiredPixels),
    across ? 'across' : 'down',
    pixels.format(across ? work.image.scanWidth : work.image.scanHeight),
  );
}

/** "Printed at 302 ppi on A3, from the museum's own scan", for the size chosen. */
export function printedAt(size: PaperOptionFragment, copy: Copy): string {
  return copy.work.printedAt(formatPpi(size.ppi, copy.locale), size.size);
}

export interface RecordEntry {
  readonly term: string;
  readonly detail: string | null;
  readonly lang?: string;
}

/** The museum writes its record in English, whatever the edition: a reader's voice should too. */
const MUSEUM = 'en';

/** The museum's record, in the order a catalogue entry gives it; null fields read as a dash. */
export function recordOf(work: Work, copy: Copy): RecordEntry[] {
  const { record } = copy.work;
  const pixels = new Intl.NumberFormat(copy.locale);
  const artist = work.artist
    ? [work.artist.name, work.artist.bio].filter(Boolean).join(', ')
    : null;
  return [
    { term: record.artist, detail: artist, lang: MUSEUM },
    { term: record.date, detail: work.date, lang: MUSEUM },
    { term: record.medium, detail: work.medium, lang: MUSEUM },
    { term: record.dimensions, detail: work.dimensions[0] ?? null, lang: MUSEUM },
    { term: record.culture, detail: work.culture, lang: MUSEUM },
    { term: record.period, detail: work.period, lang: MUSEUM },
    { term: record.creditLine, detail: work.creditLine, lang: MUSEUM },
    { term: record.objectNumber, detail: work.accessionNumber },
    { term: record.rights, detail: copy.work.rights },
    {
      term: record.scan,
      detail: work.image
        ? copy.work.scan(pixels.format(work.image.scanWidth), pixels.format(work.image.scanHeight))
        : null,
    },
  ];
}
