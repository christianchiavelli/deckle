import { DROPS } from '@deckle/drops';
import {
  EntityHydrator,
  OrderStateTransitionEvent,
  ProductService,
  type ID,
  type Order,
  type Product,
} from '@vendure/core';
import {
  EmailEventListener,
  orderConfirmationHandler,
  transformOrderLineAssetUrls,
} from '@vendure/email-plugin';
import { type ReceiptInput, receiptOf } from './receipt.js';

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

/** A work as the receipt names it: its title, and its maker and date from the museum's record. */
export interface Work {
  readonly title: string;
  readonly artist: string | null;
  readonly date: string | null;
}

/** A product as the catalogue gives it, translated: a hydrated order's products have no name or slug. */
export type CatalogueProduct = Pick<Product, 'name' | 'slug' | 'customFields'>;

/** Where the receipt finds the products its lines print, in the order's channel. */
export interface Catalogue {
  byId(id: ID): Promise<CatalogueProduct | undefined>;
  bySlug(slug: string): Promise<CatalogueProduct | undefined>;
}

export const workOf = (product: CatalogueProduct): Work => ({
  title: product.name,
  artist: product.customFields.artistName,
  date: product.customFields.objectDate,
});

/**
 * What the receipt needs of a placed order, its lines and pictures hydrated.
 * A numbered copy's product is named after its drop and carries no record, so
 * its work is the open edition's product, found by the drop's work's slug.
 */
export async function receiptInputOf(order: Order, catalogue: Catalogue): Promise<ReceiptInput> {
  const lines = await Promise.all(
    order.lines.map(async (line) => {
      const variant = line.productVariant;
      const product = (await catalogue.byId(variant.productId)) ?? variant.product;
      const drop = DROPS.find(({ slug }) => slug === product.slug);
      const work =
        (drop === undefined ? undefined : await catalogue.bySlug(drop.artworkSlug)) ?? product;
      const asset = line.featuredAsset as typeof line.featuredAsset | null | undefined;
      return {
        ...workOf(work),
        paperSize: variant.customFields.paperSize ?? variant.name,
        quantity: line.quantity,
        unitPrice: line.unitPriceWithTax,
        linePrice: line.linePriceWithTax,
        editionSize: variant.customFields.editionSize,
        image: asset ? { url: asset.preview, width: asset.width, height: asset.height } : null,
      };
    }),
  );
  const address = order.shippingAddress as typeof order.shippingAddress | null | undefined;
  return {
    code: order.code,
    placedAt: order.orderPlacedAt ?? order.updatedAt,
    currency: order.currencyCode,
    language: order.customFields.receiptLanguage,
    copyNumber: order.customFields.copyNumber,
    lines,
    subtotal: order.subTotalWithTax,
    shipping: order.shippingWithTax,
    total: order.totalWithTax,
    // Vendure gives an order with no address an empty one.
    address:
      address && (address.fullName || address.streetLine1)
        ? {
            fullName: address.fullName ?? null,
            streetLine1: address.streetLine1 ?? null,
            streetLine2: address.streetLine2 ?? null,
            city: address.city ?? null,
            postalCode: address.postalCode ?? null,
            countryCode: address.countryCode ?? null,
            country: address.country ?? null,
          }
        : null,
  };
}

/**
 * Vendure's order confirmation, sent to the receipt's address instead of always
 * the customer's, in the language the order was placed in, on Deckle's own
 * template (`templates/email/order-confirmation`).
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
      relations: ['lines.featuredAsset', 'lines.productVariant.product'],
    });
    transformOrderLineAssetUrls(event.ctx, event.order, injector);
    const products = injector.get(ProductService);
    const input = await receiptInputOf(event.order, {
      byId: (id) => products.findOne(event.ctx, id),
      bySlug: (slug) => products.findOneBySlug(event.ctx, slug),
    });
    return { receipt: receiptOf(input) };
  })
  // The filter let through only orders with a recipient.
  .setRecipient((event) => receiptRecipient(event.order) ?? '')
  .setFrom('{{ fromAddress }}')
  .setSubject('{{ subject }}')
  .setTemplateVars((event) => ({ ...event.data.receipt }));
