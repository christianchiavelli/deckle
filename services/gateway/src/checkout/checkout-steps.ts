import type { CmsLanguage } from '../cms/cms.client.js';
import type { ShopOrder } from '../commerce/shop-orders.responses.js';
import {
  CommerceRefusal,
  type CustomerDetails,
  type ShippingAddress,
  type ShopSessionClient,
} from '../commerce/shop-session.client.js';

/** The payment method commerce is seeded with: it settles at once, and no money moves. */
export const TEST_PAYMENT = 'dummy';

export const SHIPPING = {
  /** The flat rate for open editions. */
  standard: 'standard-shipping',
  /** A numbered copy's, included in its price. */
  numberedCopy: 'numbered-copy-shipping',
} as const;

/** The language each of the store's editions writes its receipts in, as commerce keeps it. */
export const RECEIPT_LANGUAGES = { en: 'en', pt: 'pt-BR' } as const satisfies Record<
  CmsLanguage,
  string
>;

export interface Checkout {
  /** The language the order is placed in, from the page's edition; its receipt is written in it. */
  readonly language: CmsLanguage;
  /** A guest's contact; a signed-in customer has theirs already. */
  readonly customer?: CustomerDetails;
  /** What a numbered copy's order carries: its number, and where the receipt goes. */
  readonly copy?: { readonly copyNumber: number; readonly receiptEmail: string };
  readonly address: ShippingAddress;
  readonly shippingMethod: string;
}

/**
 * Takes the active order in a commerce session from its cart to paid: contact,
 * address, shipping, then the test payment. An order a failed attempt left
 * waiting for payment is brought back first, so the details can change.
 */
export async function payForOrder(
  shop: ShopSessionClient,
  token: string,
  order: ShopOrder,
  checkout: Checkout,
): Promise<ShopOrder> {
  if (order.state === 'ArrangingPayment') await shop.transition(token, 'AddingItems');
  if (checkout.customer !== undefined) await shop.setCustomer(token, checkout.customer);
  await shop.setOrderFields(token, {
    ...checkout.copy,
    receiptLanguage: RECEIPT_LANGUAGES[checkout.language],
  });
  await shop.setShippingAddress(token, checkout.address);
  await shipBy(shop, token, checkout.shippingMethod);
  await shop.transition(token, 'ArrangingPayment');
  const { value: paid } = await shop.pay(token, TEST_PAYMENT);
  if (paid.orderPlacedAt === null) {
    throw new CommerceRefusal('PAYMENT_FAILED_ERROR', `The order is ${paid.state} after payment`);
  }
  return paid;
}

/** Sets the order's shipping by the method's code; commerce says which methods the order may use. */
export async function shipBy(shop: ShopSessionClient, token: string, code: string) {
  const id = (await shop.shippingMethods(token)).get(code);
  if (id === undefined) {
    throw new CommerceRefusal('INELIGIBLE_SHIPPING_METHOD_ERROR', `${code} cannot ship this order`);
  }
  return shop.setShippingMethod(token, id);
}
