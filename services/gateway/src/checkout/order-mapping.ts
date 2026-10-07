import { DROPS } from '@deckle/drops';
import { PAPER_SIZE_ORDER, type PaperSize } from '@deckle/print-sizes';
import type { ShopOrder, ShopOrderLine } from '../commerce/shop-orders.responses.js';
import type { Cart, OrderLine, PlacedOrder } from './order.model.js';

export const EMPTY_CART: Cart = {
  lines: [],
  quantity: 0,
  subtotal: null,
  shipping: null,
  total: null,
};

const paperSizeOf = (size: string | null): PaperSize | null =>
  PAPER_SIZE_ORDER.find((known) => known === size) ?? null;

/** A drop's edition is a product named after the drop; the work it prints is the drop's. */
const artworkOfDrop = (dropSlug: string) =>
  DROPS.find((drop) => drop.slug === dropSlug)?.artworkSlug ?? null;

export function lineOf(line: ShopOrderLine, order: ShopOrder): OrderLine {
  const money = (amount: number) => ({ amount, currencyCode: order.currencyCode });
  const { customFields, product } = line.productVariant;
  const numbered = customFields.editionSize !== null;
  return {
    id: line.id,
    artworkSlug: numbered ? (artworkOfDrop(product.slug) ?? product.slug) : product.slug,
    drop: numbered ? product.slug : null,
    size: paperSizeOf(customFields.paperSize),
    quantity: line.quantity,
    unitPrice: money(line.unitPriceWithTax),
    price: money(line.linePriceWithTax),
    copyNumber: numbered ? (order.customFields?.copyNumber ?? null) : null,
    editionSize: customFields.editionSize,
  };
}

export function cartOf(order: ShopOrder | null): Cart {
  if (order === null || order.lines.length === 0) return EMPTY_CART;
  const money = (amount: number) => ({ amount, currencyCode: order.currencyCode });
  return {
    lines: order.lines.map((line) => lineOf(line, order)),
    quantity: order.totalQuantity,
    subtotal: money(order.subTotalWithTax),
    shipping: order.shippingLines.length === 0 ? null : money(order.shippingWithTax),
    total: money(order.totalWithTax),
  };
}

/** An order commerce has placed; null when it is not placed yet. */
export function placedOrderOf(order: ShopOrder | null): PlacedOrder | null {
  if (order?.orderPlacedAt === null || order === null) return null;
  const money = (amount: number) => ({ amount, currencyCode: order.currencyCode });
  const address = order.shippingAddress;
  return {
    code: order.code,
    placedAt: new Date(order.orderPlacedAt),
    email: order.customFields?.receiptEmail ?? order.customer?.emailAddress ?? null,
    lines: order.lines.map((line) => lineOf(line, order)),
    subtotal: money(order.subTotalWithTax),
    shipping: money(order.shippingWithTax),
    total: money(order.totalWithTax),
    shipTo:
      address === null
        ? null
        : {
            fullName: address.fullName,
            streetLine1: address.streetLine1,
            streetLine2: address.streetLine2,
            city: address.city,
            postalCode: address.postalCode,
            country: address.country,
            countryCode: address.countryCode,
          },
  };
}
