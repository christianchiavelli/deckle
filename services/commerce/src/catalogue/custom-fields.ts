import { PAPER_SIZE_ORDER, type PaperSize } from '@deckle/print-sizes';
import { LanguageCode, type CustomFieldConfig } from '@vendure/core';

const label = (value: string) => [{ languageCode: LanguageCode.en, value }];

const museumRecord = { tab: 'Museum record' };

/**
 * The museum record. The seed writes it from The Met's data set; `readonly` keeps it
 * out of every GraphQL input, so neither the dashboard nor the gateway can edit it,
 * and it stays public in the Shop API. Every field is nullable because The Met leaves
 * gaps, and a gap is `null`, never `""` or `0`.
 */
export const productCustomFields: CustomFieldConfig[] = [
  {
    name: 'metObjectId',
    type: 'int',
    unique: true,
    nullable: true,
    readonly: true,
    min: 1,
    label: label('The Met object ID'),
    description: label('The objectID in The Met collection API; how the seed recognises a work'),
    ui: museumRecord,
  },
  {
    name: 'fullTitle',
    type: 'text',
    nullable: true,
    readonly: true,
    label: label('Full title'),
    description: label("The Met's title, verbatim. The product name is the short title."),
    ui: museumRecord,
  },
  {
    name: 'artistName',
    type: 'text',
    nullable: true,
    readonly: true,
    label: label('Artist'),
    ui: museumRecord,
  },
  {
    name: 'artistBio',
    type: 'text',
    nullable: true,
    readonly: true,
    label: label('Artist biography'),
    description: label('As The Met words it, e.g. "German, Nuremberg 1471–1528 Nuremberg"'),
    ui: museumRecord,
  },
  {
    name: 'artistNationality',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Artist nationality'),
    ui: museumRecord,
  },
  {
    name: 'artistBeginYear',
    type: 'int',
    nullable: true,
    readonly: true,
    label: label('Artist born'),
    ui: museumRecord,
  },
  {
    name: 'artistEndYear',
    type: 'int',
    nullable: true,
    readonly: true,
    label: label('Artist died'),
    ui: museumRecord,
  },
  {
    name: 'objectDate',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Date'),
    description: label('As The Met displays it, e.g. "ca. 1830–32"'),
    ui: museumRecord,
  },
  {
    name: 'objectBeginYear',
    type: 'int',
    nullable: true,
    readonly: true,
    label: label('Earliest year'),
    ui: museumRecord,
  },
  {
    name: 'objectEndYear',
    type: 'int',
    nullable: true,
    readonly: true,
    label: label('Latest year'),
    ui: museumRecord,
  },
  {
    name: 'medium',
    type: 'text',
    nullable: true,
    readonly: true,
    label: label('Medium'),
    ui: museumRecord,
  },
  {
    name: 'dimensions',
    type: 'string',
    list: true,
    nullable: true,
    readonly: true,
    label: label('Dimensions'),
    description: label('One line per measurement The Met records: plate, sheet, image'),
    ui: museumRecord,
  },
  {
    name: 'classification',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Classification'),
    ui: museumRecord,
  },
  {
    name: 'department',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Department'),
    ui: museumRecord,
  },
  {
    name: 'culture',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Culture'),
    ui: museumRecord,
  },
  {
    name: 'period',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Period'),
    ui: museumRecord,
  },
  {
    name: 'creditLine',
    type: 'text',
    nullable: true,
    readonly: true,
    label: label('Credit line'),
    ui: museumRecord,
  },
  {
    name: 'accessionNumber',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Accession number'),
    ui: museumRecord,
  },
  {
    name: 'objectUrl',
    type: 'text',
    nullable: true,
    readonly: true,
    label: label('Page at The Met'),
    ui: museumRecord,
  },
  {
    name: 'scanWidth',
    type: 'int',
    nullable: true,
    readonly: true,
    min: 1,
    label: label('Scan width (px)'),
    description: label("The original scan's width, which the print sizes are worked out from"),
    ui: museumRecord,
  },
  {
    name: 'scanHeight',
    type: 'int',
    nullable: true,
    readonly: true,
    min: 1,
    label: label('Scan height (px)'),
    description: label("The original scan's height, which the print sizes are worked out from"),
    ui: museumRecord,
  },
];

const print = { tab: 'Print' };

/**
 * What a variant prints: the sheet, the image on it, and the resolution the scan
 * gives at that size. Writable, because the gateway will create drop variants
 * through the Admin API.
 */
export const productVariantCustomFields: CustomFieldConfig[] = [
  {
    name: 'paperSize',
    type: 'string',
    nullable: true,
    options: PAPER_SIZE_ORDER.map((size) => ({ value: size, label: label(size) })),
    label: label('Paper size'),
    ui: print,
  },
  {
    name: 'paperWidthCm',
    type: 'float',
    nullable: true,
    min: 0,
    label: label('Paper width (cm)'),
    ui: print,
  },
  {
    name: 'paperHeightCm',
    type: 'float',
    nullable: true,
    min: 0,
    label: label('Paper height (cm)'),
    ui: print,
  },
  {
    name: 'imageWidthCm',
    type: 'float',
    nullable: true,
    min: 0,
    label: label('Image width (cm)'),
    ui: print,
  },
  {
    name: 'imageHeightCm',
    type: 'float',
    nullable: true,
    min: 0,
    label: label('Image height (cm)'),
    ui: print,
  },
  {
    name: 'ppi',
    type: 'int',
    nullable: true,
    min: 1,
    label: label('Pixels per inch'),
    description: label('What the original scan gives at this size, rounded down'),
    ui: print,
  },
];

declare module '@vendure/core/dist/entity/custom-entity-fields.js' {
  interface CustomProductFields {
    metObjectId: number | null;
    fullTitle: string | null;
    artistName: string | null;
    artistBio: string | null;
    artistNationality: string | null;
    artistBeginYear: number | null;
    artistEndYear: number | null;
    objectDate: string | null;
    objectBeginYear: number | null;
    objectEndYear: number | null;
    medium: string | null;
    dimensions: string[] | null;
    classification: string | null;
    department: string | null;
    culture: string | null;
    period: string | null;
    creditLine: string | null;
    accessionNumber: string | null;
    objectUrl: string | null;
    scanWidth: number | null;
    scanHeight: number | null;
  }

  interface CustomProductVariantFields {
    paperSize: PaperSize | null;
    paperWidthCm: number | null;
    paperHeightCm: number | null;
    imageWidthCm: number | null;
    imageHeightCm: number | null;
    ppi: number | null;
  }
}
