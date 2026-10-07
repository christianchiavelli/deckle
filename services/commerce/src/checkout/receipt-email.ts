import { EntityHydrator, OrderStateTransitionEvent, type Order } from '@vendure/core';
import {
  EmailEventListener,
  orderConfirmationHandler,
  shippingLinesWithMethod,
  transformOrderLineAssetUrls,
} from '@vendure/email-plugin';

/** The domain the gateway's placeholder addresses use (RFC 2606): it never resolves. */
const NEVER_DELIVERED = '.invalid';

/**
 * Where an order's receipt goes: the address given for it at checkout, or else
 * the customer's own. A customer who signed in with a passkey has only a
 * placeholder address, and nothing is ever sent to one.
 */
export function receiptRecipient(order: Pick<Order, 'customFields' | 'customer'>): string | null {
  const address = order.customFields.receiptEmail ?? order.customer?.emailAddress ?? null;
  return address === null || address.endsWith(NEVER_DELIVERED) ? null : address;
}

/**
 * Vendure's order confirmation, with its template and data, sent to the receipt's
 * address instead of always the customer's.
 */
export const orderReceiptHandler = new EmailEventListener(orderConfirmationHandler.type)
  .on(OrderStateTransitionEvent)
  .filter(
    (event) =>
      event.toState === 'PaymentSettled' &&
      event.fromState !== 'Modifying' &&
      receiptRecipient(event.order) !== null,
  )
  .loadData(async ({ event, injector }) => {
    await injector.get(EntityHydrator).hydrate(event.ctx, event.order, {
      relations: ['lines.featuredAsset', 'shippingLines.shippingMethod'],
    });
    transformOrderLineAssetUrls(event.ctx, event.order, injector);
    return { shippingLines: shippingLinesWithMethod(event.order) };
  })
  // The filter let through only orders with a recipient.
  .setRecipient((event) => receiptRecipient(event.order) ?? '')
  .setFrom('{{ fromAddress }}')
  .setSubject('Order confirmation for #{{ order.code }}')
  .setTemplateVars((event) => ({ order: event.order, shippingLines: event.data.shippingLines }));
