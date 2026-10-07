import { describe, expect, it } from 'vitest';
import type { ShopOrder } from '../commerce/shop-orders.responses.js';
import { cartOf, EMPTY_CART, lineOf, placedOrderOf } from './order-mapping.js';

const line = (
  overrides: { slug?: string; editionSize?: number | null; paperSize?: string | null } = {},
) => ({
  id: 'L1',
  quantity: 2,
  unitPriceWithTax: 9000,
  linePriceWithTax: 18_000,
  productVariant: {
    id: '12',
    sku: '336228-A3',
    customFields: {
      paperSize: overrides.paperSize === undefined ? 'A3' : overrides.paperSize,
      editionSize: overrides.editionSize ?? null,
    },
    product: { slug: overrides.slug ?? 'melencolia-i' },
  },
});

const order = (overrides: Partial<ShopOrder> = {}): ShopOrder => ({
  id: 'O1',
  code: 'DK7Q2M',
  state: 'PaymentSettled',
  active: false,
  orderPlacedAt: '2026-10-07T12:00:00.000Z',
  currencyCode: 'USD',
  totalQuantity: 2,
  subTotalWithTax: 18_000,
  shippingWithTax: 1200,
  totalWithTax: 19_200,
  customFields: { copyNumber: null, receiptEmail: null },
  customer: { emailAddress: 'guest@example.com' },
  shippingAddress: null,
  shippingLines: [],
  lines: [line()],
  ...overrides,
});

describe('lineOf', () => {
  it('reads an open edition as its work, at its size', () => {
    expect(lineOf(line(), order())).toEqual({
      id: 'L1',
      artworkSlug: 'melencolia-i',
      drop: null,
      size: 'A3',
      quantity: 2,
      unitPrice: { amount: 9000, currencyCode: 'USD' },
      price: { amount: 18_000, currencyCode: 'USD' },
      copyNumber: null,
      editionSize: null,
    });
  });

  it("reads a numbered copy as its drop's work, with the order's copy number", () => {
    const numbered = line({ slug: 'melencolia-i-numbered', editionSize: 50 });
    const placed = order({ customFields: { copyNumber: 7, receiptEmail: 'ana@example.com' } });
    expect(lineOf(numbered, placed)).toMatchObject({
      artworkSlug: 'melencolia-i',
      drop: 'melencolia-i-numbered',
      copyNumber: 7,
      editionSize: 50,
    });
  });

  it('keeps the slug of an edition no drop names, a size it does not know as null, and a missing number as null', () => {
    const stray = line({ slug: 'a-later-edition', editionSize: 25, paperSize: 'B5' });
    expect(lineOf(stray, order({ customFields: null }))).toMatchObject({
      artworkSlug: 'a-later-edition',
      size: null,
      copyNumber: null,
    });
  });
});

describe('cartOf', () => {
  it('is empty without an order or without lines', () => {
    expect(cartOf(null)).toBe(EMPTY_CART);
    expect(cartOf(order({ lines: [] }))).toBe(EMPTY_CART);
  });

  it('leaves shipping null until a method is set', () => {
    expect(cartOf(order()).shipping).toBeNull();
    const shipped = order({
      shippingLines: [{ priceWithTax: 1200, shippingMethod: { code: 'standard-shipping' } }],
    });
    expect(cartOf(shipped).shipping).toEqual({ amount: 1200, currencyCode: 'USD' });
  });
});

describe('placedOrderOf', () => {
  it('is null for no order, or one not placed yet', () => {
    expect(placedOrderOf(null)).toBeNull();
    expect(placedOrderOf(order({ orderPlacedAt: null }))).toBeNull();
  });

  it('sends the receipt where it was asked to go, else to the customer, else nowhere', () => {
    expect(
      placedOrderOf(order({ customFields: { copyNumber: 3, receiptEmail: 'ana@example.com' } }))
        ?.email,
    ).toBe('ana@example.com');
    expect(placedOrderOf(order())?.email).toBe('guest@example.com');
    expect(placedOrderOf(order({ customFields: null, customer: null }))?.email).toBeNull();
  });

  it('reads the address, field for field', () => {
    const address = {
      fullName: 'Ana Souza',
      streetLine1: '1000 Fifth Avenue',
      streetLine2: null,
      city: 'New York',
      postalCode: '10028',
      countryCode: 'US',
      country: 'United States of America',
    };
    expect(placedOrderOf(order({ shippingAddress: address }))?.shipTo).toEqual(address);
    expect(placedOrderOf(order())?.shipTo).toBeNull();
  });
});
