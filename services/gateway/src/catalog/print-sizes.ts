import { type PaperSize, PAPER_SIZE_ORDER, type Pixels, printOptions } from '@deckle/print-sizes';
import type { ShopVariant } from '../commerce/shop-api.responses.js';
import type { Money } from './models/money.model.js';
import type { PrintSize } from './models/print-size.model.js';

const isPaperSize = (value: string): value is PaperSize =>
  (PAPER_SIZE_ORDER as readonly string[]).includes(value);

/**
 * The paper size a variant prints on: its `paperSize` custom field, or failing
 * that the suffix of its SKU, which commerce writes as `<objectId>-<size>`.
 */
export function variantPaperSize(variant: ShopVariant, objectId: number): PaperSize | null {
  const declared = variant.customFields.paperSize;
  if (declared !== null) return isPaperSize(declared) ? declared : null;
  const suffix = variant.sku.startsWith(`${objectId}-`)
    ? variant.sku.slice(`${objectId}-`.length)
    : '';
  return isPaperSize(suffix) ? suffix : null;
}

/**
 * Every paper size for a scan, worked out by `@deckle/print-sizes`, joined with
 * the variants commerce sells. A size is for sale only when the scan holds enough
 * pixels for it and commerce has a variant for it; otherwise it says which is missing.
 */
export function printSizesFor(
  scan: Pixels,
  variants: readonly ShopVariant[],
  objectId: number,
): PrintSize[] {
  const variantsBySize = new Map<PaperSize, ShopVariant>();
  for (const variant of variants) {
    const size = variantPaperSize(variant, objectId);
    if (size !== null && !variantsBySize.has(size)) variantsBySize.set(size, variant);
  }

  return printOptions(scan).map((option) => {
    const variant = option.available ? variantsBySize.get(option.size) : undefined;
    const base = {
      size: option.size,
      paper: { ...option.paper },
      image: { ...option.image },
      ppi: option.ppi,
      requiredPixels: option.requiredPixels,
    };
    if (variant === undefined) {
      return {
        ...base,
        available: false,
        unavailableReason: option.available ? 'NOT_OFFERED' : 'RESOLUTION_TOO_LOW',
        variantId: null,
        sku: null,
        price: null,
      };
    }
    return {
      ...base,
      available: true,
      unavailableReason: null,
      variantId: variant.id,
      sku: variant.sku,
      price: { amount: variant.priceWithTax, currencyCode: variant.currencyCode },
    };
  });
}

/** The cheapest size for sale, or null when nothing is. */
export function priceFrom(sizes: readonly PrintSize[]): Money | null {
  let cheapest: Money | null = null;
  for (const { price } of sizes) {
    if (price !== null && (cheapest === null || price.amount < cheapest.amount)) cheapest = price;
  }
  return cheapest;
}
