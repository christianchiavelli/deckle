import {
  ConfigService,
  EntityHydrator,
  Order,
  OrderStateTransitionEvent,
  RequestContext,
  type Injector,
  type OrderState,
} from '@vendure/core';
import { orderConfirmationHandler } from '@vendure/email-plugin';
import { describe, expect, it } from 'vitest';
import { orderReceiptHandler, receiptRecipient } from './receipt-email.js';

const orderWith = (receiptEmail: string | null, customerEmail: string | null) =>
  new Order({
    code: 'DK7Q2M',
    customFields: { copyNumber: receiptEmail === null ? null : 7, receiptEmail },
    customer: customerEmail === null ? undefined : { emailAddress: customerEmail },
    lines: [],
    shippingLines: [],
  });

/** What the handler asks the injector for: the hydrator, and where asset URLs point. */
const injector = {
  get: (token: unknown) =>
    token === EntityHydrator
      ? { hydrate: () => Promise.resolve() }
      : token === ConfigService
        ? { assetOptions: { assetStorageStrategy: {} } }
        : undefined,
} as unknown as Injector;

/**
 * `handle` is typed for the event after its data has loaded; the plugin passes the
 * bare event, and the handler's own loader replaces this empty data before use.
 */
const transition = (order: Order, fromState: OrderState, toState: OrderState) =>
  Object.assign(new OrderStateTransitionEvent(fromState, toState, RequestContext.empty(), order), {
    data: { shippingLines: [] },
  });

const settled = (order: Order, fromState: OrderState = 'ArrangingPayment') =>
  transition(order, fromState, 'PaymentSettled');

describe('receiptRecipient', () => {
  it('sends to the address given for the receipt first', () => {
    expect(receiptRecipient(orderWith('ana@example.com', 'f1c2@users.deckle.invalid'))).toBe(
      'ana@example.com',
    );
  });

  it("falls back to the customer's own address, as a guest's order has it", () => {
    expect(receiptRecipient(orderWith(null, 'guest@example.com'))).toBe('guest@example.com');
  });

  it('sends nothing to a placeholder address, or without any', () => {
    expect(receiptRecipient(orderWith(null, 'f1c2@users.deckle.invalid'))).toBeNull();
    expect(receiptRecipient(orderWith(null, null))).toBeNull();
  });
});

describe('orderReceiptHandler', () => {
  it("replaces Vendure's order confirmation, template and all", () => {
    expect(orderReceiptHandler.type).toBe(orderConfirmationHandler.type);
  });

  it("mails a drop's receipt to the address given at checkout", async () => {
    const order = orderWith('ana@example.com', 'f1c2@users.deckle.invalid');
    const email = await orderReceiptHandler.handle(settled(order), {}, injector);
    expect(email).toMatchObject({
      recipient: 'ana@example.com',
      subject: 'Order confirmation for #{{ order.code }}',
      templateVars: { order, shippingLines: [] },
    });
  });

  it('mails nothing to a placeholder, before payment, or for a modified order', async () => {
    const placeholder = orderWith(null, 'f1c2@users.deckle.invalid');
    expect(await orderReceiptHandler.handle(settled(placeholder), {}, injector)).toBeUndefined();
    const guest = orderWith(null, 'guest@example.com');
    const arranging = transition(guest, 'AddingItems', 'ArrangingPayment');
    expect(await orderReceiptHandler.handle(arranging, {}, injector)).toBeUndefined();
    expect(
      await orderReceiptHandler.handle(settled(guest, 'Modifying'), {}, injector),
    ).toBeUndefined();
  });
});
