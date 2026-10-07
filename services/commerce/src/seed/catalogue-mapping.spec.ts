import { fileURLToPath } from 'node:url';
import { readCatalog, type Work } from '@deckle/met';
import { printOptions } from '@deckle/print-sizes';
import { describe, expect, it } from 'vitest';
import {
  centuryOf,
  facetValuesOf,
  imageTypeOf,
  labelOf,
  OPEN_EDITION_PRICES,
  productCustomFieldsOf,
  skuOf,
  slugify,
  techniquesOf,
  variantsOf,
} from './catalogue-mapping.js';

const dataSet = fileURLToPath(new URL('../../../../data/met', import.meta.url));

const work: Work = {
  objectId: 45434,
  slug: 'under-the-wave-off-kanagawa',
  title: 'Under the Wave off Kanagawa (Kanagawa oki nami ura), also known as The Great Wave',
  shortTitle: 'Under the Wave off Kanagawa',
  artist: {
    name: 'Katsushika Hokusai',
    bio: 'Japanese, Tokyo (Edo) 1760–1849 Tokyo (Edo)',
    nationality: 'Japanese',
    beginYear: 1760,
    endYear: 1849,
  },
  date: { display: 'ca. 1830–32', beginYear: 1820, endYear: 1842 },
  medium: 'Woodblock print; ink and color on paper',
  dimensions: ['10 1/8 × 14 15/16 in. (25.7 × 37.9 cm)'],
  classification: 'Prints',
  department: 'Asian Art',
  culture: 'Japan',
  period: 'Edo period (1615–1868)',
  creditLine: 'H. O. Havemeyer Collection, Bequest of Mrs. H. O. Havemeyer, 1929',
  accessionNumber: 'JP1847',
  objectUrl: 'https://www.metmuseum.org/art/collection/search/45434',
  tags: ['Waves', 'Boats', 'Mountains'],
  image: {
    file: '45434.webp',
    width: 2400,
    height: 1613,
    originalWidth: 3859,
    originalHeight: 2594,
    crop: null,
    sha256: 'a'.repeat(64),
    sourceUrl: 'https://images.metmuseum.org/CRDImages/as/original/DP130155.jpg',
  },
};

/** A work The Met recorded almost nothing about. */
const sparse: Work = {
  ...work,
  objectId: 1,
  slug: 'untitled',
  artist: null,
  date: { display: null, beginYear: null, endYear: null },
  medium: null,
  dimensions: [],
  classification: null,
  department: null,
  culture: null,
  period: null,
  creditLine: null,
  accessionNumber: null,
};

describe('slugify', () => {
  it('folds accents and punctuation into a URL slug', () => {
    expect(slugify('Albrecht Dürer')).toBe('albrecht-durer');
    expect(slugify('Goya (Francisco de Goya y Lucientes)')).toBe(
      'goya-francisco-de-goya-y-lucientes',
    );
    expect(slugify('  Drawings & Prints  ')).toBe('drawings-prints');
  });
});

describe('techniquesOf', () => {
  it.each([
    ['Engraving', ['Engraving']],
    ['Etching, aquatint', ['Etching', 'Aquatint']],
    ['Etching, aquatint, and drypoint', ['Etching', 'Aquatint', 'Drypoint']],
    ['Etching and engraving', ['Etching', 'Engraving']],
    ['Woodblock print; ink and color on paper', ['Woodblock print']],
    ['Engraving, engraving', ['Engraving']],
  ])('reads %j as %j', (medium, techniques) => {
    expect(techniquesOf(medium)).toEqual(techniques);
  });

  it('has nothing to say about a missing medium', () => {
    expect(techniquesOf(null)).toEqual([]);
  });
});

describe('centuryOf', () => {
  it.each([
    [1514, '16th century', '16th-century'],
    [1500, '15th century', '15th-century'],
    [1501, '16th century', '16th-century'],
    [1820, '19th century', '19th-century'],
    [1901, '20th century', '20th-century'],
    [2001, '21st century', '21st-century'],
    [-450, '5th century BCE', '5th-century-bce'],
    [-1100, '11th century BCE', '11th-century-bce'],
    [-200, '2nd century BCE', '2nd-century-bce'],
    [-300, '3rd century BCE', '3rd-century-bce'],
  ])('puts %i in the %s', (year, name, code) => {
    expect(centuryOf({ display: String(year), beginYear: year, endYear: null })).toEqual({
      code,
      name,
    });
  });

  it('falls back to the end year, then to nothing', () => {
    expect(centuryOf({ display: null, beginYear: null, endYear: 1799 })?.name).toBe('18th century');
    expect(centuryOf({ display: 'undated', beginYear: null, endYear: null })).toBeNull();
  });
});

describe('facetValuesOf', () => {
  it('files a work under its artist, techniques, century, department and edition', () => {
    expect(facetValuesOf(work).map(({ facet, code }) => `${facet}:${code}`)).toEqual([
      'artist:katsushika-hokusai',
      'technique:woodblock-print',
      'century:19th-century',
      'department:asian-art',
      'edition:open',
    ]);
  });

  it('files a work with nothing recorded under its edition only', () => {
    expect(facetValuesOf(sparse)).toEqual([
      { facet: 'edition', code: 'open', name: 'Open edition' },
    ]);
  });
});

describe('productCustomFieldsOf', () => {
  it("copies the museum record, with The Met's gaps as null", () => {
    expect(productCustomFieldsOf(sparse)).toEqual({
      metObjectId: 1,
      fullTitle: work.title,
      artistName: null,
      artistBio: null,
      artistNationality: null,
      artistBeginYear: null,
      artistEndYear: null,
      objectDate: null,
      objectBeginYear: null,
      objectEndYear: null,
      medium: null,
      dimensions: [],
      classification: null,
      department: null,
      culture: null,
      period: null,
      creditLine: null,
      accessionNumber: null,
      objectUrl: work.objectUrl,
      scanWidth: 3859,
      scanHeight: 2594,
    });
    expect(productCustomFieldsOf(work)).toMatchObject({
      artistName: 'Katsushika Hokusai',
      culture: 'Japan',
    });
  });
});

describe('labelOf', () => {
  it('reads like a museum label, leaving out what is missing', () => {
    expect(labelOf(work)).toBe(
      'Woodblock print; ink and color on paper by Katsushika Hokusai, ca. 1830–32',
    );
    expect(labelOf({ ...sparse, classification: 'Prints' })).toBe('Prints');
    expect(labelOf(sparse)).toBe('');
  });
});

describe('imageTypeOf', () => {
  it.each([
    ['45434.webp', 'image/webp'],
    ['336228.jpg', 'image/jpeg'],
    ['SCAN.JPEG', 'image/jpeg'],
  ])('reads %s as %s', (file, type) => {
    expect(imageTypeOf(file)).toBe(type);
  });

  it.each(['scan.tiff', 'scan'])('stops at %s', (file) => {
    expect(() => imageTypeOf(file)).toThrow('JPEG or WebP');
  });
});

describe('variantsOf', () => {
  it('offers every size the original scan prints at 240 ppi, priced as an open edition', () => {
    const variants = variantsOf(work);
    const sellable = printOptions({ width: 3859, height: 2594 }).filter(
      (option) => option.available,
    );
    expect(variants.map(({ size }) => size)).toEqual(sellable.map(({ size }) => size));
    expect(variants[0]).toEqual({
      size: 'A4',
      sku: '45434-A4',
      name: 'Under the Wave off Kanagawa (A4)',
      price: 5500,
      customFields: {
        paperSize: 'A4',
        paperWidthCm: sellable[0]?.paper.width,
        paperHeightCm: sellable[0]?.paper.height,
        imageWidthCm: sellable[0]?.image.width,
        imageHeightCm: sellable[0]?.image.height,
        ppi: sellable[0]?.ppi,
      },
    });
  });

  it('offers nothing for a scan too small for an A4', () => {
    expect(
      variantsOf({ ...work, image: { ...work.image, originalWidth: 900, originalHeight: 1200 } }),
    ).toEqual([]);
  });

  it('never sizes from the reduced master the shop serves', () => {
    const fromMaster = variantsOf({ ...work, image: { ...work.image, width: 10, height: 10 } });
    expect(fromMaster).toEqual(variantsOf(work));
  });
});

describe('the data set in data/met', async () => {
  const catalog = await readCatalog(dataSet);

  it.each(catalog.works.map((each) => [each.slug, each] as const))(
    '%s maps to sellable variants with unique SKUs and the open-edition prices',
    (_slug, each) => {
      const variants = variantsOf(each);
      for (const variant of variants) {
        expect(variant.sku).toBe(skuOf(each, variant.size));
        expect(variant.price).toBe(OPEN_EDITION_PRICES[variant.size]);
        expect(variant.customFields.ppi).toBeGreaterThanOrEqual(240);
      }
      expect(new Set(variants.map(({ sku }) => sku)).size).toBe(variants.length);
      expect(() => imageTypeOf(each.image.file)).not.toThrow();
      expect(productCustomFieldsOf(each).metObjectId).toBe(each.objectId);
    },
  );
});
