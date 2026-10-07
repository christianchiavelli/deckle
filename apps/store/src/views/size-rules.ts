import { MIN_PPI, PAPER_SIZE_ORDER, PAPER_SIZES, type PaperSize } from '@deckle/print-sizes';
import { formatCentimetres } from '@deckle/ui/format';
import type { Copy } from '../copy';
import type { PaperOptionFragment } from '../gateway/generated';
import type { ListedWork } from './listing';
import { smallestFirst } from './work';

const CM_PER_INCH = 2.54;

export interface SizeRule {
  readonly size: PaperSize;
  /** "21 × 29.7 cm" */
  readonly sheet: string;
  /** The image inside the border: "16 × 24.7 cm". */
  readonly area: string;
  /** What the area needs at the minimum: "1,512 × 2,334 px". */
  readonly pixels: string;
  /** How many works in the shop are sold at this size. */
  readonly works: number;
}

/**
 * Every paper size the shop knows, what it takes, and how many works reach it,
 * from the same table the shop sizes by.
 */
export function sizeRulesOf(works: readonly ListedWork[], copy: Copy): SizeRule[] {
  const number = new Intl.NumberFormat(copy.locale);
  const need = (cm: number) => number.format(Math.ceil((cm / CM_PER_INCH) * MIN_PPI));
  return PAPER_SIZE_ORDER.map((size) => {
    const { short, long, margin } = PAPER_SIZES[size];
    const area = { width: short - 2 * margin, height: long - 2 * margin };
    return {
      size,
      sheet: formatCentimetres({ width: short, height: long }, copy.locale),
      area: formatCentimetres(area, copy.locale),
      pixels: `${need(area.width)} × ${need(area.height)} px`,
      works: works.filter((work) =>
        work.sizes.some((option) => option.size === size && option.available),
      ).length,
    };
  });
}

/** The largest size no work reaches, to say so; null when every size is reached. */
export function noneAt(rules: readonly SizeRule[]): PaperSize | null {
  return rules.find((rule) => rule.works === 0)?.size ?? null;
}

/** "A4 only" or "Up to A3": how far a work's scan goes. Null when it prints nothing. */
export function verdictOf(sizes: readonly PaperOptionFragment[], copy: Copy): string | null {
  const sold = smallestFirst(sizes).filter((size) => size.available);
  const largest = sold.at(-1);
  if (!largest) {
    return null;
  }
  return sold.length === 1 ? copy.sizes.only(largest.size) : copy.sizes.upTo(largest.size);
}
