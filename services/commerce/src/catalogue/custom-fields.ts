import { PAPER_SIZE_ORDER, type PaperSize } from '@deckle/print-sizes';
import { LanguageCode, type CustomFieldConfig } from '@vendure/core';

/** A label or description in both of the dashboard's languages; leaving one out is a type error. */
const label = (en: string, ptBR: string) => [
  { languageCode: LanguageCode.en, value: en },
  { languageCode: LanguageCode.pt_BR, value: ptBR },
];

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
    label: label('The Met object ID', 'ID do objeto no Met'),
    description: label(
      'The objectID in The Met collection API; how the seed recognises a work',
      'O objectID na API do acervo do Met; é por ele que o seed reconhece uma obra',
    ),
    ui: museumRecord,
  },
  {
    name: 'fullTitle',
    type: 'text',
    nullable: true,
    readonly: true,
    label: label('Full title', 'Título completo'),
    description: label(
      "The Met's title, verbatim. The product name is the short title.",
      'O título do Met, sem alterações. O nome do produto é o título curto.',
    ),
    ui: museumRecord,
  },
  {
    name: 'artistName',
    type: 'text',
    nullable: true,
    readonly: true,
    label: label('Artist', 'Artista'),
    ui: museumRecord,
  },
  {
    name: 'artistBio',
    type: 'text',
    nullable: true,
    readonly: true,
    label: label('Artist biography', 'Biografia do artista'),
    description: label(
      'As The Met words it, e.g. "German, Nuremberg 1471–1528 Nuremberg"',
      'Como o Met escreve, por exemplo "German, Nuremberg 1471–1528 Nuremberg"',
    ),
    ui: museumRecord,
  },
  {
    name: 'artistNationality',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Artist nationality', 'Nacionalidade do artista'),
    ui: museumRecord,
  },
  {
    name: 'artistBeginYear',
    type: 'int',
    nullable: true,
    readonly: true,
    label: label('Artist born', 'Nascimento do artista'),
    ui: museumRecord,
  },
  {
    name: 'artistEndYear',
    type: 'int',
    nullable: true,
    readonly: true,
    label: label('Artist died', 'Morte do artista'),
    ui: museumRecord,
  },
  {
    name: 'objectDate',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Date', 'Data'),
    description: label(
      'As The Met displays it, e.g. "ca. 1830–32"',
      'Como o Met mostra, por exemplo "ca. 1830–32"',
    ),
    ui: museumRecord,
  },
  {
    name: 'objectBeginYear',
    type: 'int',
    nullable: true,
    readonly: true,
    label: label('Earliest year', 'Ano inicial'),
    ui: museumRecord,
  },
  {
    name: 'objectEndYear',
    type: 'int',
    nullable: true,
    readonly: true,
    label: label('Latest year', 'Ano final'),
    ui: museumRecord,
  },
  {
    name: 'medium',
    type: 'text',
    nullable: true,
    readonly: true,
    label: label('Medium', 'Técnica'),
    ui: museumRecord,
  },
  {
    name: 'dimensions',
    type: 'string',
    list: true,
    nullable: true,
    readonly: true,
    label: label('Dimensions', 'Dimensões'),
    description: label(
      'One line per measurement The Met records: plate, sheet, image',
      'Uma linha por medida que o Met registra: chapa, folha, imagem',
    ),
    ui: museumRecord,
  },
  {
    name: 'classification',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Classification', 'Classificação'),
    ui: museumRecord,
  },
  {
    name: 'department',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Department', 'Departamento'),
    ui: museumRecord,
  },
  {
    name: 'culture',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Culture', 'Cultura'),
    ui: museumRecord,
  },
  {
    name: 'period',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Period', 'Período'),
    ui: museumRecord,
  },
  {
    name: 'creditLine',
    type: 'text',
    nullable: true,
    readonly: true,
    label: label('Credit line', 'Crédito'),
    ui: museumRecord,
  },
  {
    name: 'accessionNumber',
    type: 'string',
    nullable: true,
    readonly: true,
    label: label('Accession number', 'Número de tombo'),
    ui: museumRecord,
  },
  {
    name: 'objectUrl',
    type: 'text',
    nullable: true,
    readonly: true,
    label: label('Page at The Met', 'Página no Met'),
    ui: museumRecord,
  },
  {
    name: 'scanWidth',
    type: 'int',
    nullable: true,
    readonly: true,
    min: 1,
    label: label('Scan width (px)', 'Largura do scan (px)'),
    description: label(
      "The original scan's width, which the print sizes are worked out from",
      'A largura do scan original, de onde saem os tamanhos de impressão',
    ),
    ui: museumRecord,
  },
  {
    name: 'scanHeight',
    type: 'int',
    nullable: true,
    readonly: true,
    min: 1,
    label: label('Scan height (px)', 'Altura do scan (px)'),
    description: label(
      "The original scan's height, which the print sizes are worked out from",
      'A altura do scan original, de onde saem os tamanhos de impressão',
    ),
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
    // A paper size reads the same in both languages.
    options: PAPER_SIZE_ORDER.map((size) => ({ value: size, label: label(size, size) })),
    label: label('Paper size', 'Tamanho do papel'),
    ui: print,
  },
  {
    name: 'paperWidthCm',
    type: 'float',
    nullable: true,
    min: 0,
    label: label('Paper width (cm)', 'Largura do papel (cm)'),
    ui: print,
  },
  {
    name: 'paperHeightCm',
    type: 'float',
    nullable: true,
    min: 0,
    label: label('Paper height (cm)', 'Altura do papel (cm)'),
    ui: print,
  },
  {
    name: 'imageWidthCm',
    type: 'float',
    nullable: true,
    min: 0,
    label: label('Image width (cm)', 'Largura da imagem (cm)'),
    ui: print,
  },
  {
    name: 'imageHeightCm',
    type: 'float',
    nullable: true,
    min: 0,
    label: label('Image height (cm)', 'Altura da imagem (cm)'),
    ui: print,
  },
  {
    name: 'ppi',
    type: 'int',
    nullable: true,
    min: 1,
    label: label('Pixels per inch', 'Pixels por polegada'),
    description: label(
      'What the original scan gives at this size, rounded down',
      'O que o scan original rende neste tamanho, arredondado para baixo',
    ),
    ui: print,
  },
  {
    name: 'editionSize',
    type: 'int',
    nullable: true,
    // The seed sets it with the edition; a numbered copy cannot become an open one.
    readonly: true,
    min: 1,
    label: label('Numbered edition of', 'Tiragem numerada de'),
    description: label(
      "How many numbered copies a drop's edition has; empty for an open edition",
      'Quantas cópias numeradas a tiragem de um drop tem; vazio numa tiragem aberta',
    ),
    ui: print,
  },
];

const drop = { tab: 'Drop' };

/**
 * What an order for a drop's numbered copy carries besides its lines. The gateway
 * sets both through the Shop API, which only it can reach: the copy's number for
 * whoever pencils it, and where the receipt goes, since a customer who signed in
 * with a passkey has no address of their own.
 */
export const orderCustomFields: CustomFieldConfig[] = [
  {
    name: 'copyNumber',
    type: 'int',
    nullable: true,
    min: 1,
    label: label('Copy number', 'Número da cópia'),
    description: label(
      'The number to write in pencil, out of the edition',
      'O número a escrever a lápis, dentro da tiragem',
    ),
    ui: drop,
  },
  {
    name: 'receiptEmail',
    type: 'string',
    nullable: true,
    label: label('Receipt email', 'E-mail do recibo'),
    description: label(
      'Where the order confirmation goes, when it is not the customer’s own address',
      'Para onde vai a confirmação do pedido, quando não é o endereço do próprio cliente',
    ),
    ui: drop,
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
    editionSize: number | null;
  }

  interface CustomOrderFields {
    copyNumber: number | null;
    receiptEmail: string | null;
  }
}
