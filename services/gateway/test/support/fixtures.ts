/**
 * Upstream documents in the shape commerce and the CMS send them, built from
 * real works in the data set. Hand-written rather than read from data/met, so
 * the importer replacing the data set does not change what the tests assert.
 */

export interface ShopVariantDocument {
  id: string;
  sku: string;
  priceWithTax: number;
  currencyCode: string;
  customFields: { paperSize: string | null };
}

export interface ShopProductDocument {
  id: string;
  slug: string;
  name: string;
  featuredAsset: { source: string; width: number; height: number } | null;
  variants: ShopVariantDocument[];
  facetValues: { name: string; facet: { code: string } }[];
  customFields: Record<string, unknown>;
}

const PRICES = { A4: 5500, A3: 9000, A2: 14000, A1: 21000 } as const;
type Size = keyof typeof PRICES;

interface Work {
  id: string;
  objectId: number;
  slug: string;
  name: string;
  fullTitle: string;
  artist: {
    name: string;
    bio: string;
    nationality: string;
    beginYear: number;
    endYear: number;
  } | null;
  date: string | null;
  /** The year the work was begun, as The Met records it. */
  year: number | null;
  /** The technique family the commerce seed files the work under. */
  technique: string | null;
  medium: string | null;
  dimensions: string[] | string | null;
  classification: string | null;
  department: string | null;
  culture: string | null;
  period: string | null;
  creditLine: string | null;
  accessionNumber: string | null;
  scan: { width: number; height: number };
  master: { width: number; height: number } | null;
  /** The sizes commerce sells. */
  sold: Size[];
}

export function shopProduct(work: Work): ShopProductDocument {
  return {
    id: work.id,
    slug: work.slug,
    name: work.name,
    featuredAsset:
      work.master === null
        ? null
        : {
            source: `http://localhost:8080/assets/source/${work.objectId}.jpg`,
            width: work.master.width,
            height: work.master.height,
          },
    variants: work.sold.map((size, index) => ({
      id: `${work.id}${index + 1}`,
      sku: `${work.objectId}-${size}`,
      priceWithTax: PRICES[size],
      currencyCode: 'USD',
      customFields: { paperSize: size },
    })),
    facetValues: [
      ...(work.artist === null ? [] : [{ name: work.artist.name, facet: { code: 'artist' } }]),
      ...(work.technique === null ? [] : [{ name: work.technique, facet: { code: 'technique' } }]),
      { name: 'Open edition', facet: { code: 'edition' } },
    ],
    customFields: {
      metObjectId: work.objectId,
      fullTitle: work.fullTitle,
      artistName: work.artist?.name ?? null,
      artistBio: work.artist?.bio ?? null,
      artistNationality: work.artist?.nationality ?? null,
      artistBeginYear: work.artist?.beginYear ?? null,
      artistEndYear: work.artist?.endYear ?? null,
      objectDate: work.date,
      objectBeginYear: work.year,
      medium: work.medium,
      dimensions: work.dimensions,
      classification: work.classification,
      department: work.department,
      culture: work.culture,
      period: work.period,
      creditLine: work.creditLine,
      accessionNumber: work.accessionNumber,
      objectUrl: `https://www.metmuseum.org/art/collection/search/${work.objectId}`,
      scanWidth: work.scan.width,
      scanHeight: work.scan.height,
    },
  };
}

const durer = {
  name: 'Albrecht Dürer',
  bio: 'German, Nuremberg 1471–1528 Nuremberg',
  nationality: 'German',
  beginYear: 1471,
  endYear: 1528,
};

/** Its scan prints A4 and A3; A2 would need 3213 px along its width. The Met records no culture. */
export const melencolia = shopProduct({
  id: '1',
  objectId: 336228,
  slug: 'melencolia-i',
  name: 'Melencolia I',
  fullTitle: 'Melencolia I',
  artist: durer,
  date: '1514',
  year: 1514,
  technique: 'Engravings',
  medium: 'Engraving',
  dimensions: ['Plate: 9 7/16 × 7 5/16 in. (24 × 18.5 cm)'],
  classification: 'Prints',
  department: 'Drawings and Prints',
  culture: null,
  period: null,
  creditLine: 'Harris Brisbane Dick Fund, 1943',
  accessionNumber: '43.106.1',
  scan: { width: 2820, height: 3561 },
  master: { width: 1622, height: 2048 },
  sold: ['A4', 'A3'],
});

/** Commerce sells only A4 although the scan could print A3: that size is "not offered". */
export const rhinoceros = shopProduct({
  id: '2',
  objectId: 356497,
  slug: 'the-rhinoceros',
  name: 'The Rhinoceros',
  fullTitle: 'The Rhinoceros',
  artist: durer,
  date: '1515',
  year: 1515,
  technique: 'Woodcuts',
  medium: 'Woodcut',
  // Commerce may keep the lines in one text field; they read the same.
  dimensions:
    'image: 8 3/8 x 11 5/8 in. (21.3 x 29.5 cm) trimmed to block line except at top\nsheet: 9 3/8 x 11 3/4 in. (23.8 x 29.9 cm)',
  classification: 'Prints',
  department: 'Drawings and Prints',
  culture: '',
  period: '  ',
  creditLine: 'Gift of Junius Spencer Morgan, 1919',
  accessionNumber: '19.73.159',
  scan: { width: 3811, height: 3049 },
  master: { width: 2048, height: 1639 },
  sold: ['A4'],
});

export const greatWave = shopProduct({
  id: '3',
  objectId: 45434,
  slug: 'under-the-wave-off-kanagawa',
  name: 'Under the Wave off Kanagawa',
  fullTitle:
    'Under the Wave off Kanagawa (Kanagawa oki nami ura), also known as The Great Wave, from the series Thirty-six Views of Mount Fuji (Fugaku sanjūrokkei)',
  artist: {
    name: 'Katsushika Hokusai',
    bio: 'Japanese, Tokyo (Edo) 1760–1849 Tokyo (Edo)',
    nationality: 'Japanese',
    beginYear: 1760,
    endYear: 1849,
  },
  date: 'ca. 1830–32',
  year: 1830,
  technique: 'Woodblock prints',
  medium: 'Woodblock print; ink and color on paper',
  dimensions: ['10 1/8 x 14 15/16 in. (25.7 x 37.9 cm)'],
  classification: 'Prints',
  department: 'Asian Art',
  culture: 'Japan',
  period: 'Edo period (1615–1868)',
  creditLine: 'H. O. Havemeyer Collection, Bequest of Mrs. H. O. Havemeyer, 1929',
  accessionNumber: 'JP1847',
  scan: { width: 3859, height: 2594 },
  master: { width: 2048, height: 1377 },
  sold: ['A4', 'A3'],
});

/** A work whose maker is unknown and whose picture commerce does not have yet. */
export const anonymousSampler = shopProduct({
  id: '4',
  objectId: 1001,
  slug: 'alphabet-sampler',
  name: 'Alphabet Sampler',
  fullTitle: 'Alphabet Sampler',
  artist: null,
  date: null,
  year: null,
  technique: null,
  medium: null,
  dimensions: null,
  classification: null,
  department: null,
  culture: null,
  period: null,
  creditLine: null,
  accessionNumber: null,
  scan: { width: 2400, height: 3000 },
  master: null,
  sold: [],
});

export const products = [melencolia, rhinoceros, greatWave, anonymousSampler];

export const collections = [
  { id: '10', slug: 'prints', name: 'Prints', productIds: ['1', '2', '3', '4'] },
  { id: '11', slug: 'japanese-prints', name: 'Japanese Prints', productIds: ['3'] },
];

/** Payload's Lexical JSON, with what a story may hold and some of what it may not. */
export const melencoliaBody = {
  root: {
    type: 'root',
    version: 1,
    children: [
      {
        type: 'heading',
        tag: 'h2',
        version: 1,
        children: [{ type: 'text', text: 'A print about thinking', format: 0, version: 1 }],
      },
      {
        type: 'paragraph',
        version: 1,
        children: [
          { type: 'text', text: 'Dürer cut ', format: 0, version: 1 },
          { type: 'text', text: 'Melencolia I', format: 2, version: 1 },
          { type: 'text', text: ' in ', format: 0, version: 1 },
          { type: 'text', text: '1514', format: 1, version: 1 },
          { type: 'text', text: '. See ', format: 0, version: 1 },
          {
            type: 'link',
            version: 3,
            fields: {
              linkType: 'custom',
              url: 'https://www.metmuseum.org/art/collection/search/336228',
              newTab: true,
            },
            children: [{ type: 'text', text: 'the museum page', format: 0, version: 1 }],
          },
          { type: 'text', text: '.', format: 0, version: 1 },
        ],
      },
      { type: 'upload', version: 3, value: 7, relationTo: 'media' },
      {
        type: 'quote',
        version: 1,
        children: [
          { type: 'text', text: 'Saturn, the melancholic planet.', format: 3, version: 1 },
        ],
      },
    ],
  },
};

/** Stories as Payload's REST API returns them: the CMS's user reads drafts too. */
export const stories = [
  {
    id: 1,
    artworkSlug: 'melencolia-i',
    title: 'The angel who cannot act',
    lede: 'Why a winged figure sits idle among tools.',
    detail: { x: 74, y: 22, zoom: 3 },
    body: melencoliaBody,
    sources: [
      {
        id: 'a',
        label: 'The Met, Heilbrunn Timeline of Art History',
        url: 'https://www.metmuseum.org/toah/',
      },
      // The CMS only stores http(s) addresses; the gateway refuses others all the same.
      {
        id: 'b',
        label: 'Panofsky, The Life and Art of Albrecht Dürer',
        url: 'javascript:alert(1)',
      },
    ],
    _status: 'published',
    updatedAt: '2026-09-30T10:00:00.000Z',
    createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 2,
    artworkSlug: 'under-the-wave-off-kanagawa',
    title: 'A wave seen from the boats',
    lede: null,
    // An editor who left the detail empty: Payload still sends the group.
    detail: { x: null, y: null, zoom: null },
    body: { root: { type: 'root', children: [] } },
    sources: [],
    _status: 'published',
    updatedAt: '2026-09-29T10:00:00.000Z',
    createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 3,
    artworkSlug: 'the-rhinoceros',
    title: 'An animal nobody in Nuremberg had seen',
    lede: 'Still a draft.',
    body: { root: { type: 'root', children: [] } },
    sources: [],
    _status: 'draft',
    updatedAt: '2026-10-01T10:00:00.000Z',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
];

export const curations = [
  {
    id: 7,
    title: 'Dürer and the occult',
    slug: 'durer-and-the-occult',
    intro: 'Three prints, one restless mind.',
    // The knight is not sold by commerce: the curation shows the other two.
    artworks: ['melencolia-i', 'knight-death-and-the-devil', 'the-rhinoceros'],
    _status: 'published',
    updatedAt: '2026-09-28T10:00:00.000Z',
    createdAt: '2026-09-20T10:00:00.000Z',
  },
  {
    id: 8,
    title: 'Animals on paper',
    slug: 'animals-on-paper',
    intro: null,
    artworks: ['the-rhinoceros'],
    _status: 'draft',
    updatedAt: '2026-10-02T10:00:00.000Z',
    createdAt: '2026-10-02T10:00:00.000Z',
  },
];
