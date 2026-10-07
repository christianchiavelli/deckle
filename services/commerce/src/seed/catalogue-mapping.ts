import type { Work } from '@deckle/met';
import { availableSizes, type PaperSize, type PrintOption } from '@deckle/print-sizes';

/** Open-edition prices in USD cents, taxes included (BRIEF, "Prices"). */
export const OPEN_EDITION_PRICES: Readonly<Record<PaperSize, number>> = {
  A4: 5500,
  A3: 9000,
  A2: 14000,
  A1: 21000,
};

export type FacetCode = 'artist' | 'technique' | 'century' | 'department' | 'edition';

export interface FacetDefinition {
  readonly code: FacetCode;
  readonly name: string;
}

/**
 * The four facets a visitor browses by, and `edition`, which every open-edition
 * product carries so that "All prints" can be a facet filter like the other
 * collections (drops will add a "limited" value).
 */
export const FACETS: readonly FacetDefinition[] = [
  { code: 'artist', name: 'Artist' },
  { code: 'technique', name: 'Technique' },
  { code: 'century', name: 'Century' },
  { code: 'department', name: 'Department' },
  { code: 'edition', name: 'Edition' },
];

export const OPEN_EDITION = { code: 'open', name: 'Open edition' } as const;

export interface FacetValueRef {
  readonly facet: FacetCode;
  readonly code: string;
  readonly name: string;
}

/** Lower-case ASCII words joined by hyphens: "Albrecht Dürer" becomes "albrecht-durer". */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The technique families a buyer browses by, each with the pattern that finds
 * it in The Met's medium. The first match wins, and the medium is read from its
 * start, so a work belongs to the process The Met names first: "Etching,
 * aquatint" is an etching, "Mezzotint with etching" a mezzotint. Woodblock
 * prints (the Japanese colour prints) and woodcuts stay apart, as The Met keeps
 * them; a zincograph is drawn and printed as a lithograph is.
 */
const TECHNIQUE_FAMILIES: readonly (readonly [name: string, pattern: RegExp])[] = [
  ['Woodblock prints', /woodblock/i],
  ['Woodcuts', /woodcut/i],
  ['Lithographs', /lithograph|zincograph/i],
  ['Engravings', /^engraving/i],
  ['Etchings', /^etching/i],
  ['Mezzotints', /^mezzotint/i],
  ['Drypoints', /^drypoint/i],
  ['Aquatints', /aquatint/i],
];

/**
 * The family a work is filed under, or null when its medium names none. One per
 * work: the medium's qualifiers ("printed in gray and black", "lavis (along the
 * top of the landscape...)") are never read as techniques of their own.
 */
export function techniqueOf(medium: string | null): string | null {
  if (medium === null) {
    return null;
  }
  return TECHNIQUE_FAMILIES.find(([, pattern]) => pattern.test(medium))?.[0] ?? null;
}

const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) {
    return `${n}th`;
  }
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
};

/**
 * The century a work was made in, read from the earliest year The Met gives. Years
 * 1501 to 1600 are the 16th century; The Met writes years before the common era as
 * negative numbers, and has no year zero.
 */
export function centuryOf(date: Work['date']): { code: string; name: string } | null {
  const year = date.beginYear ?? date.endYear;
  if (year === null) {
    return null;
  }
  const century = Math.floor((Math.max(Math.abs(year), 1) - 1) / 100) + 1;
  const name = year > 0 ? `${ordinal(century)} century` : `${ordinal(century)} century BCE`;
  return { code: slugify(name), name };
}

/** The facet values a work is filed under; a field The Met leaves empty files it nowhere. */
export function facetValuesOf(work: Work): FacetValueRef[] {
  const values: FacetValueRef[] = [];
  if (work.artist) {
    values.push({ facet: 'artist', code: slugify(work.artist.name), name: work.artist.name });
  }
  const technique = techniqueOf(work.medium);
  if (technique !== null) {
    values.push({ facet: 'technique', code: slugify(technique), name: technique });
  }
  const century = centuryOf(work.date);
  if (century) {
    values.push({ facet: 'century', ...century });
  }
  if (work.department) {
    values.push({ facet: 'department', code: slugify(work.department), name: work.department });
  }
  values.push({ facet: 'edition', ...OPEN_EDITION });
  return values;
}

/** The museum record, field for field as `custom-fields.ts` declares it. */
export function productCustomFieldsOf(work: Work) {
  return {
    metObjectId: work.objectId,
    fullTitle: work.title,
    artistName: work.artist?.name ?? null,
    artistBio: work.artist?.bio ?? null,
    artistNationality: work.artist?.nationality ?? null,
    artistBeginYear: work.artist?.beginYear ?? null,
    artistEndYear: work.artist?.endYear ?? null,
    objectDate: work.date.display,
    objectBeginYear: work.date.beginYear,
    objectEndYear: work.date.endYear,
    medium: work.medium,
    dimensions: work.dimensions,
    classification: work.classification,
    department: work.department,
    culture: work.culture,
    period: work.period,
    creditLine: work.creditLine,
    accessionNumber: work.accessionNumber,
    objectUrl: work.objectUrl,
    scanWidth: work.image.originalWidth,
    scanHeight: work.image.originalHeight,
  };
}

/**
 * A line in the manner of a museum label, "Engraving by Albrecht Dürer, 1514", from
 * what the record has. Vendure requires a description; the work's story lives in the CMS.
 */
export function labelOf(work: Work): string {
  const what = work.medium ?? work.classification;
  const by = work.artist ? `by ${work.artist.name}` : null;
  const head = [what, by].filter((part) => part !== null).join(' ');
  return [head, work.date.display].filter((part) => part !== null && part.length > 0).join(', ');
}

const imageTypes: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/**
 * The media type of a master image, from its extension: the importer writes WebP,
 * the first data set had JPEG. Anything else stops the seed before Vendure stores it
 * as an untyped file the asset server cannot transform.
 */
export function imageTypeOf(file: string): string {
  const extension = /\.([a-z0-9]+)$/i.exec(file)?.[1]?.toLowerCase();
  const type = extension === undefined ? undefined : imageTypes[extension];
  if (type === undefined) {
    throw new Error(`${file} is not an image the shop can serve (JPEG or WebP)`);
  }
  return type;
}

export interface VariantPlan {
  readonly size: PaperSize;
  readonly sku: string;
  readonly name: string;
  readonly price: number;
  readonly customFields: {
    paperSize: PaperSize;
    paperWidthCm: number;
    paperHeightCm: number;
    imageWidthCm: number;
    imageHeightCm: number;
    ppi: number;
  };
}

export function skuOf(work: Work, size: PaperSize): string {
  return `${work.objectId}-${size}`;
}

function variantOf(work: Work, option: PrintOption): VariantPlan {
  return {
    size: option.size,
    sku: skuOf(work, option.size),
    name: `${work.shortTitle} (${option.size})`,
    price: OPEN_EDITION_PRICES[option.size],
    customFields: {
      paperSize: option.size,
      paperWidthCm: option.paper.width,
      paperHeightCm: option.paper.height,
      imageWidthCm: option.image.width,
      imageHeightCm: option.image.height,
      ppi: option.ppi,
    },
  };
}

/**
 * One variant per size the original scan can print at the minimum resolution,
 * smallest first. Sizes are worked out from the original's pixels, never the
 * reduced master the shop serves.
 */
export function variantsOf(work: Work): VariantPlan[] {
  const scan = { width: work.image.originalWidth, height: work.image.originalHeight };
  return availableSizes(scan).map((option) => variantOf(work, option));
}
