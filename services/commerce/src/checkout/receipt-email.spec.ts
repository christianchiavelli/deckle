import {
  Asset,
  ConfigService,
  CurrencyCode,
  EntityHydrator,
  Order,
  OrderLine,
  OrderStateTransitionEvent,
  Product,
  ProductService,
  ProductVariant,
  RequestContext,
  type ID,
  type Injector,
  type OrderState,
} from '@vendure/core';
import { orderConfirmationHandler } from '@vendure/email-plugin';
import { describe, expect, it } from 'vitest';
import {
  type Catalogue,
  type CatalogueProduct,
  orderReceiptHandler,
  receiptInputOf,
  receiptRecipient,
} from './receipt-email.js';
import type { Receipt } from './receipt.js';

const orderWith = (receiptEmail: string | null, customerEmail: string | null) =>
  new Order({
    code: 'DK7Q2M',
    currencyCode: CurrencyCode.USD,
    orderPlacedAt: new Date('2026-10-08T15:07:34Z'),
    customFields: {
      receiptLanguage: 'pt-BR',
      copyNumber: receiptEmail === null ? null : 7,
      receiptEmail,
    },
    customer: customerEmail === null ? undefined : { emailAddress: customerEmail },
    shippingAddress: {},
    lines: [],
    shippingLines: [],
    subTotalWithTax: 0,
    shippingWithTax: 0,
  });

/** The catalogue's products, translated, as `ProductService` returns them. */
const products: Record<string, CatalogueProduct & { id: ID }> = {
  work: {
    id: 1,
    slug: 'melencolia-i',
    name: 'Melencolia I',
    customFields: { artistName: 'Albrecht Dürer', objectDate: '1514' },
  } as CatalogueProduct & { id: ID },
  // The drop's edition: named after the drop, with no record of the work.
  edition: {
    id: 2,
    slug: 'melencolia-i-numbered',
    name: 'Melencolia I, numbered edition',
    customFields: { artistName: null, objectDate: null },
  } as CatalogueProduct & { id: ID },
};

const catalogue: Catalogue = {
  byId: (id) => Promise.resolve(Object.values(products).find((product) => product.id === id)),
  bySlug: (slug) =>
    Promise.resolve(Object.values(products).find((product) => product.slug === slug)),
};

/**
 * A line as the hydrator leaves it: the variant's product is there, but not its
 * translations, so it has no name and no slug.
 */
const lineOf = (productId: ID, editionSize: number | null, listPrice: number) =>
  new OrderLine({
    quantity: 1,
    listPrice,
    listPriceIncludesTax: true,
    taxLines: [],
    adjustments: [],
    productVariant: new ProductVariant({
      productId,
      product: new Product({ customFields: { artistName: null, objectDate: null } }),
      customFields: { paperSize: 'A3', editionSize },
    }),
    featuredAsset: new Asset({
      preview: 'http://localhost:8080/assets/preview/31/336228__preview.webp',
      width: 1901,
      height: 2400,
    }),
  });

/** What the handler asks the injector for: the hydrator, where asset URLs point, and the catalogue. */
const injector = {
  get: (token: unknown) =>
    token === EntityHydrator
      ? { hydrate: () => Promise.resolve() }
      : token === ConfigService
        ? { assetOptions: { assetStorageStrategy: {} } }
        : token === ProductService
          ? {
              findOne: (_ctx: RequestContext, id: ID) => catalogue.byId(id),
              findOneBySlug: (_ctx: RequestContext, slug: string) => catalogue.bySlug(slug),
            }
          : undefined,
} as unknown as Injector;

/**
 * `handle` is typed for the event after its data has loaded; the plugin passes the
 * bare event, and the handler's own loader replaces this placeholder before use.
 */
const transition = (order: Order, fromState: OrderState, toState: OrderState) =>
  Object.assign(new OrderStateTransitionEvent(fromState, toState, RequestContext.empty(), order), {
    data: { receipt: {} as Receipt },
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

describe('receiptInputOf', () => {
  it("names an open edition's line by its product, as the catalogue translates it", async () => {
    const order = orderWith(null, 'guest@example.com');
    order.lines = [lineOf(1, null, 9000)];
    const input = await receiptInputOf(order, catalogue);
    expect(input).toMatchObject({
      code: 'DK7Q2M',
      currency: 'USD',
      language: 'pt-BR',
      copyNumber: null,
      address: null,
    });
    expect(input.lines).toEqual([
      {
        title: 'Melencolia I',
        artist: 'Albrecht Dürer',
        date: '1514',
        paperSize: 'A3',
        quantity: 1,
        unitPrice: 9000,
        linePrice: 9000,
        editionSize: null,
        image: {
          url: 'http://localhost:8080/assets/preview/31/336228__preview.webp',
          width: 1901,
          height: 2400,
        },
      },
    ]);
  });

  it("names a numbered copy by its drop's work, which the edition's product does not record", async () => {
    const order = orderWith('ana@example.com', 'f1c2@users.deckle.invalid');
    order.lines = [lineOf(2, 50, 18_000)];
    order.shippingAddress = {
      fullName: 'Ana Souza',
      streetLine1: 'Avenida Paulista, 1578',
      city: 'São Paulo',
      postalCode: '01310-200',
      countryCode: 'BR',
      country: 'Brazil',
    };
    const input = await receiptInputOf(order, catalogue);
    expect(input.copyNumber).toBe(7);
    expect(input.lines[0]).toMatchObject({
      title: 'Melencolia I',
      artist: 'Albrecht Dürer',
      editionSize: 50,
      unitPrice: 18_000,
    });
    expect(input.address).toEqual({
      fullName: 'Ana Souza',
      streetLine1: 'Avenida Paulista, 1578',
      streetLine2: null,
      city: 'São Paulo',
      postalCode: '01310-200',
      countryCode: 'BR',
      country: 'Brazil',
    });
  });

  it("keeps the edition's own name where the drop's work is gone, and dates an unplaced order by its last change", async () => {
    const order = orderWith(null, 'guest@example.com');
    order.lines = [lineOf(2, 50, 18_000)];
    order.lines[0]!.featuredAsset = undefined as unknown as Asset;
    order.orderPlacedAt = undefined;
    order.updatedAt = new Date('2026-10-09T09:00:00Z');
    const input = await receiptInputOf(order, {
      byId: (id) => catalogue.byId(id),
      bySlug: () => Promise.resolve(undefined),
    });
    expect(input.lines[0]).toMatchObject({ title: 'Melencolia I, numbered edition', image: null });
    expect(input.placedAt).toEqual(new Date('2026-10-09T09:00:00Z'));
  });
});

describe('orderReceiptHandler', () => {
  it("replaces Vendure's order confirmation, template and all", () => {
    expect(orderReceiptHandler.type).toBe(orderConfirmationHandler.type);
  });

  it("mails a drop's receipt to the address given at checkout, in the order's language", async () => {
    const order = orderWith('ana@example.com', 'f1c2@users.deckle.invalid');
    order.lines = [lineOf(2, 50, 18_000)];
    const email = await orderReceiptHandler.handle(settled(order), {}, injector);
    expect(email).toMatchObject({
      recipient: 'ana@example.com',
      subject: '{{ subject }}',
      templateVars: {
        lang: 'pt-BR',
        subject: 'Seu recibo do pedido DK7Q2M',
        words: { thanks: 'Obrigado' },
        lines: [{ title: 'Melencolia I, exemplar 7 de 50' }],
      },
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
