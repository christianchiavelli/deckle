/** The least resolution a print is sold at. Below it, fine line work starts to soften at arm's length. */
export const MIN_PPI = 240;

const CM_PER_INCH = 2.54;

/**
 * ISO A sizes, short side by long side, with the white border kept round the image.
 * The border grows with the sheet, as it does on a print made to be framed.
 */
export const PAPER_SIZES = {
  A4: { short: 21, long: 29.7, margin: 2.5 },
  A3: { short: 29.7, long: 42, margin: 3 },
  A2: { short: 42, long: 59.4, margin: 4 },
  A1: { short: 59.4, long: 84.1, margin: 5 },
} as const;

export type PaperSize = keyof typeof PAPER_SIZES;

export const PAPER_SIZE_ORDER = Object.keys(PAPER_SIZES) as PaperSize[];

export interface Pixels {
  readonly width: number;
  readonly height: number;
}

export interface Centimetres {
  readonly width: number;
  readonly height: number;
}

export interface PrintOption {
  readonly size: PaperSize;
  /** The sheet, turned to the image's orientation. */
  readonly paper: Centimetres;
  /** The printed image: the scan's proportions, as large as the border allows, never cropped. */
  readonly image: Centimetres;
  /** Pixels per inch the scan gives at this size, rounded down so it is never overstated. */
  readonly ppi: number;
  readonly available: boolean;
  /** The side of the image that runs out of border first, and so sets the scale. */
  readonly limitingSide: 'width' | 'height';
  /** Pixels the scan would need along its limiting side to reach the minimum, or null when it has them. */
  readonly requiredPixels: number | null;
}

/** Rounds to one decimal, the precision a print size is quoted in. */
const toTenth = (cm: number) => Math.round(cm * 10) / 10;

function assertScan({ width, height }: Pixels) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(`A scan is measured in whole pixels above zero, not ${width} × ${height}`);
  }
}

/**
 * Every paper size, and whether this scan can print it at `minPpi` or more.
 *
 * The image keeps its proportions and fits inside the border, so one side
 * meets the border and sets the scale; the resolution is read along that side.
 */
export function printOptions(scan: Pixels, minPpi: number = MIN_PPI): PrintOption[] {
  assertScan(scan);
  const landscape = scan.width > scan.height;
  const aspect = scan.width / scan.height;

  return PAPER_SIZE_ORDER.map((size) => {
    const { short, long, margin } = PAPER_SIZES[size];
    const paper = landscape ? { width: long, height: short } : { width: short, height: long };
    const box = { width: paper.width - 2 * margin, height: paper.height - 2 * margin };

    const limitingSide = aspect >= box.width / box.height ? 'width' : 'height';
    const image =
      limitingSide === 'width'
        ? { width: box.width, height: box.width / aspect }
        : { width: box.height * aspect, height: box.height };

    const pixels = limitingSide === 'width' ? scan.width : scan.height;
    const inches = image[limitingSide] / CM_PER_INCH;
    const ppi = Math.floor(pixels / inches);
    const available = ppi >= minPpi;

    return {
      size,
      paper,
      image: { width: toTenth(image.width), height: toTenth(image.height) },
      ppi,
      available,
      limitingSide,
      requiredPixels: available ? null : Math.ceil(inches * minPpi),
    };
  });
}

/** The sizes this scan can be sold at, smallest first. */
export function availableSizes(scan: Pixels, minPpi: number = MIN_PPI): PrintOption[] {
  return printOptions(scan, minPpi).filter((option) => option.available);
}
