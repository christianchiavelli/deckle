import { formatMoney, MISSING } from '@deckle/ui/format';
import type { Copy } from '../copy';
import type {
  AmountFragment,
  CartLineViewFragment,
  CartViewFragment,
  PlacedOrderViewFragment,
} from '../live/generated';
import { imageAt } from './images';
import { metaOf } from './tiles';

/** "$90", or a dash for an amount commerce left out. */
export function moneyOf(money: Omit<AmountFragment, '__typename'> | null, copy: Copy): string {
  return money === null ? MISSING : formatMoney(money.amount, money.currencyCode, copy.locale);
}

export interface LineView {
  readonly id: string;
  /** The work's page, or the drop's for a numbered copy. */
  readonly href: string;
  readonly image: { readonly src: string; readonly width: number; readonly height: number } | null;
  readonly title: string;
  /** "Albrecht Dürer, 1514". */
  readonly meta: string;
  /** "A3, unframed · $90 each", or "A3, numbered 7/50 in pencil". */
  readonly size: string;
  readonly total: string;
  readonly quantity: number;
  /** The size alone, to name the line's quantity control. */
  readonly paper: string;
}

type OrderLine = PlacedOrderViewFragment['lines'][number];

/** A line of a cart, or of an order, as its row shows it. */
export function lineOf(line: CartLineViewFragment | OrderLine, copy: Copy): LineView {
  const work = line.artwork;
  const title = work?.title ?? line.artworkSlug;
  const paper = line.size ?? MISSING;
  const numbered =
    'copyNumber' in line &&
    line.drop !== null &&
    line.copyNumber !== null &&
    line.editionSize !== null
      ? { drop: line.drop, number: line.copyNumber, of: line.editionSize }
      : null;
  return {
    id: line.id,
    href: copy.path(numbered ? `/drops/${numbered.drop}` : `/prints/${line.artworkSlug}`),
    image: work?.image
      ? {
          src: imageAt(work.image.url, 'thumb'),
          width: work.image.width,
          height: work.image.height,
        }
      : null,
    title: numbered ? copy.checkout.copyTitle(title, numbered.number, numbered.of) : title,
    meta: work ? metaOf(work) : '',
    size: numbered
      ? copy.checkout.copySize(paper, numbered.number, numbered.of)
      : copy.cart.size(paper, moneyOf(line.unitPrice, copy)),
    total: moneyOf(line.price, copy),
    quantity: line.quantity,
    paper,
  };
}

/** The sum under a cart or an order: its prints, the tube's shipping, and the total. */
export function summaryOf(
  order: Pick<CartViewFragment, 'quantity' | 'subtotal' | 'shipping' | 'total'>,
  copy: Copy,
) {
  return [
    { label: copy.cart.subtotal(order.quantity), value: moneyOf(order.subtotal, copy) },
    { label: copy.cart.shipping, value: moneyOf(order.shipping, copy) },
    { label: copy.cart.total, value: moneyOf(order.total, copy) },
  ];
}

/**
 * An order's sum. A numbered copy's order says which copy it paid for, and that
 * its shipping is included rather than free.
 */
export function orderSummaryOf(order: PlacedOrderViewFragment, copy: Copy) {
  const [first] = order.lines;
  if (
    order.lines.length === 1 &&
    typeof first?.copyNumber === 'number' &&
    first.editionSize !== null &&
    order.shipping.amount === 0
  ) {
    return [
      {
        label: copy.checkout.copyRow(first.copyNumber, first.editionSize),
        value: moneyOf(order.subtotal, copy),
      },
      { label: copy.cart.shipping, value: copy.checkout.included },
      { label: copy.cart.total, value: moneyOf(order.total, copy) },
    ];
  }
  return summaryOf(
    { ...order, quantity: order.lines.reduce((sum, line) => sum + line.quantity, 0) },
    copy,
  );
}
