import { LanguageCode, ShippingEligibilityChecker, type Order } from '@vendure/core';

/**
 * Whether an order holds numbered copies and nothing else. A drop's copy is sold
 * with its shipping in the price, so the method that charges nothing is offered
 * to such an order only, never to a cart of open editions.
 */
export function holdsOnlyNumberedCopies(order: Pick<Order, 'lines'>): boolean {
  return (
    order.lines.length > 0 &&
    order.lines.every((line) => typeof line.productVariant.customFields.editionSize === 'number')
  );
}

export const numberedCopiesOnly = new ShippingEligibilityChecker({
  code: 'numbered-copies-only',
  description: [
    { languageCode: LanguageCode.en, value: 'Orders of numbered copies only' },
    { languageCode: LanguageCode.pt_BR, value: 'Só pedidos de cópias numeradas' },
  ],
  args: {},
  check: (_ctx, order) => holdsOnlyNumberedCopies(order),
});
