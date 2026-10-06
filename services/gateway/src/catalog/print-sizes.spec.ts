import { describe, expect, it } from 'vitest';
import type { ShopVariant } from '../commerce/shop-api.responses.js';
import { priceFrom, printSizesFor, variantPaperSize } from './print-sizes.js';

const OBJECT_ID = 336228;
/** Melencolia I's original scan: A4 and A3 print at 240 ppi or more, A2 and A1 do not. */
const SCAN = { width: 2820, height: 3561 };

const variant = (
  size: string,
  priceWithTax: number,
  declared: string | null = size,
): ShopVariant => ({
  id: `v-${size}`,
  sku: `${OBJECT_ID}-${size}`,
  priceWithTax,
  currencyCode: 'USD',
  customFields: { paperSize: declared },
});

describe('printSizesFor', () => {
  it('lists A4 to A1, every one, whatever commerce sells', () => {
    expect(printSizesFor(SCAN, [], OBJECT_ID).map((size) => size.size)).toEqual([
      'A4',
      'A3',
      'A2',
      'A1',
    ]);
  });

  it('sells a size the scan supports and commerce has a variant for', () => {
    const [a4] = printSizesFor(SCAN, [variant('A4', 5500)], OBJECT_ID);

    expect(a4).toEqual({
      size: 'A4',
      paper: { width: 21, height: 29.7 },
      image: { width: 16, height: 20.2 },
      ppi: 447,
      requiredPixels: null,
      available: true,
      unavailableReason: null,
      variantId: 'v-A4',
      sku: '336228-A4',
      price: { amount: 5500, currencyCode: 'USD' },
    });
  });

  it('says how many pixels a size would need when the scan is too small for it', () => {
    const a2 = printSizesFor(SCAN, [], OBJECT_ID)[2];

    expect(a2).toMatchObject({
      size: 'A2',
      ppi: 210,
      available: false,
      unavailableReason: 'RESOLUTION_TOO_LOW',
      requiredPixels: 3213,
      variantId: null,
      price: null,
    });
  });

  it('never sells a size the scan cannot print, even if commerce has a variant for it', () => {
    const a1 = printSizesFor(SCAN, [variant('A1', 21000)], OBJECT_ID)[3];

    expect(a1).toMatchObject({
      available: false,
      unavailableReason: 'RESOLUTION_TOO_LOW',
      variantId: null,
      price: null,
    });
  });

  it('marks a size the scan supports but commerce does not sell as not offered', () => {
    const a3 = printSizesFor(SCAN, [variant('A4', 5500)], OBJECT_ID)[1];

    expect(a3).toMatchObject({
      available: false,
      unavailableReason: 'NOT_OFFERED',
      requiredPixels: null,
    });
  });

  it('turns the sheet to a landscape scan', () => {
    const [a4] = printSizesFor({ width: 3859, height: 2594 }, [], 45434);
    expect(a4?.paper).toEqual({ width: 29.7, height: 21 });
  });
});

describe('variantPaperSize', () => {
  it('reads the size from the custom field, or from the SKU suffix when the field is empty', () => {
    expect(variantPaperSize(variant('A3', 9000), OBJECT_ID)).toBe('A3');
    expect(variantPaperSize(variant('A3', 9000, null), OBJECT_ID)).toBe('A3');
  });

  it('ignores a variant whose size it does not know', () => {
    expect(variantPaperSize(variant('A0', 1, 'A0'), OBJECT_ID)).toBeNull();
    expect(variantPaperSize({ ...variant('A3', 1, null), sku: 'other-A3' }, OBJECT_ID)).toBeNull();
  });
});

describe('priceFrom', () => {
  it('is the cheapest size for sale, or null when none is', () => {
    const sizes = printSizesFor(SCAN, [variant('A3', 9000), variant('A4', 5500)], OBJECT_ID);
    expect(priceFrom(sizes)).toEqual({ amount: 5500, currencyCode: 'USD' });
    expect(priceFrom(printSizesFor(SCAN, [], OBJECT_ID))).toBeNull();
  });
});
