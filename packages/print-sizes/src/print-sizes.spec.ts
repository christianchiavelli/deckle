import { describe, expect, it } from 'vitest';
import {
  availableSizes,
  MIN_PPI,
  printOptions,
  type PaperSize,
  type PrintOption,
} from './print-sizes.js';

// Pixel sizes read from the headers of The Met's own files.
const melencolia = { width: 2820, height: 3561 };
const knight = { width: 1566, height: 2006 };
const greatWave = { width: 3859, height: 2594 };

const bySize = (options: PrintOption[]) =>
  Object.fromEntries(options.map((option) => [option.size, option])) as Partial<
    Record<PaperSize, PrintOption>
  >;

describe('printOptions', () => {
  it('quotes every size, available or not, in order', () => {
    expect(printOptions(melencolia).map((option) => option.size)).toEqual(['A4', 'A3', 'A2', 'A1']);
  });

  it('fits a portrait scan to the border without cropping it', () => {
    const { A3 } = bySize(printOptions(melencolia));
    expect(A3).toMatchObject({
      paper: { width: 29.7, height: 42 },
      image: { width: 23.7, height: 29.9 },
      limitingSide: 'width',
    });
  });

  it('reads the resolution along the side that sets the scale, rounded down', () => {
    const sizes = bySize(printOptions(melencolia));
    expect(sizes.A4?.ppi).toBe(447);
    expect(sizes.A3?.ppi).toBe(302);
    expect(sizes.A2?.ppi).toBe(210);
  });

  it('refuses a size under the minimum and says how many pixels it would take', () => {
    const { A3, A2 } = bySize(printOptions(melencolia));
    expect(A3).toMatchObject({ available: true, requiredPixels: null });
    expect(A2).toMatchObject({ available: false, requiredPixels: 3213 });
  });

  it('turns the sheet for a landscape scan, where the height can be what runs out', () => {
    const { A3, A2 } = bySize(printOptions(greatWave));
    expect(A3).toMatchObject({
      paper: { width: 42, height: 29.7 },
      limitingSide: 'height',
      ppi: 278,
      available: true,
    });
    expect(A2).toMatchObject({ ppi: 193, available: false, requiredPixels: 3213 });
  });

  it('can leave a small scan a single size', () => {
    expect(availableSizes(knight).map((option) => option.size)).toEqual(['A4']);
  });

  it('takes a different minimum when asked', () => {
    expect(availableSizes(melencolia, 200).map((option) => option.size)).toEqual([
      'A4',
      'A3',
      'A2',
    ]);
    expect(MIN_PPI).toBe(240);
  });

  it('rejects a scan that is not whole pixels above zero', () => {
    expect(() => printOptions({ width: 0, height: 10 })).toThrow(RangeError);
    expect(() => printOptions({ width: 10.5, height: 10 })).toThrow(RangeError);
  });
});
