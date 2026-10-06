import {
  Asset,
  AssetEvent,
  Collection,
  CollectionEvent,
  CollectionModificationEvent,
  CollectionTranslation,
  LanguageCode,
  OrderPlacedEvent,
  Product,
  ProductChannelEvent,
  ProductEvent,
  ProductTranslation,
  ProductVariant,
  ProductVariantChannelEvent,
  ProductVariantEvent,
  ProductVariantPrice,
  ProductVariantPriceEvent,
  RequestContext,
  StockAdjustment,
  StockMovementEvent,
  Order,
} from '@vendure/core';
import { describe, expect, it } from 'vitest';
import { changesFromEvent } from './catalogue-changes.js';

const ctx = RequestContext.empty();
const en = LanguageCode.en;

const product = new Product({
  id: 3,
  translations: [
    new ProductTranslation({ languageCode: LanguageCode.de, slug: 'melencolia-i-de' }),
    new ProductTranslation({ languageCode: en, slug: 'melencolia-i' }),
  ],
});

describe('changesFromEvent', () => {
  it('reads a product change with its slug in the shop language', () => {
    const [change] = changesFromEvent(new ProductEvent(ctx, product, 'updated'), en);
    expect(change).toMatchObject({
      kind: 'product',
      action: 'updated',
      productId: 3,
      slug: 'melencolia-i',
    });
  });

  it('falls back to the first translation, then to no slug at all', () => {
    const [german] = changesFromEvent(new ProductEvent(ctx, product, 'updated'), LanguageCode.fr);
    expect(german).toMatchObject({ slug: 'melencolia-i-de' });
    const bare = new Product({ id: 4 });
    const [none] = changesFromEvent(new ProductEvent(ctx, bare, 'deleted'), en);
    expect(none).toMatchObject({ productId: 4, slug: null });
  });

  it('reads a product joining or leaving the channel as created or deleted', () => {
    const joined = changesFromEvent(new ProductChannelEvent(ctx, product, 1, 'assigned'), en);
    const left = changesFromEvent(new ProductChannelEvent(ctx, product, 1, 'removed'), en);
    expect([joined[0]?.action, left[0]?.action]).toEqual(['created', 'deleted']);
  });

  it('keeps the product of each variant when the event carries it', () => {
    const variants = [
      new ProductVariant({ id: 7, productId: 3 }),
      new ProductVariant({ id: 8, productId: 3 }),
    ];
    const [change] = changesFromEvent(new ProductVariantEvent(ctx, variants, 'created'), en);
    expect(change).toMatchObject({
      kind: 'variants',
      type: 'variant',
      action: 'created',
      refs: [
        { variantId: 7, productId: 3 },
        { variantId: 8, productId: 3 },
      ],
    });
    const [moved] = changesFromEvent(
      new ProductVariantChannelEvent(ctx, new ProductVariant({ id: 9 }), 1, 'removed'),
      en,
    );
    expect(moved).toMatchObject({ action: 'deleted', refs: [{ variantId: 9, productId: null }] });
  });

  it('refers to a price by its own id when it arrives without its variant', () => {
    const withVariant = new ProductVariantPrice({
      id: 20,
      variant: new ProductVariant({ id: 7, productId: 3 }),
    });
    const alone = new ProductVariantPrice({ id: 21 });
    const [change] = changesFromEvent(
      new ProductVariantPriceEvent(ctx, [withVariant, alone], 'updated'),
      en,
    );
    expect(change).toMatchObject({
      type: 'price',
      refs: [{ variantId: 7, productId: 3 }, { priceId: 21 }],
    });
  });

  it('reads stock from the variants the movements name, and ignores movements without one', () => {
    const movements = [
      new StockAdjustment({ productVariant: new ProductVariant({ id: 7 }), quantity: -1 }),
      new StockAdjustment({ quantity: 2 }),
    ];
    const [change] = changesFromEvent(new StockMovementEvent(ctx, movements), en);
    expect(change).toMatchObject({
      type: 'stock',
      action: 'updated',
      refs: [{ variantId: 7, productId: null }],
    });
    expect(
      changesFromEvent(new StockMovementEvent(ctx, [new StockAdjustment({ quantity: 1 })]), en),
    ).toEqual([]);
  });

  it('reads collections, whose slug only survives in the event once they are deleted', () => {
    const collection = new Collection({
      id: 5,
      translations: [new CollectionTranslation({ languageCode: en, slug: 'engravings' })],
    });
    const [deleted] = changesFromEvent(new CollectionEvent(ctx, collection, 'deleted'), en);
    expect(deleted).toMatchObject({
      kind: 'collection',
      action: 'deleted',
      collectionId: 5,
      slug: 'engravings',
    });
    const [refiltered] = changesFromEvent(
      new CollectionModificationEvent(ctx, collection, [7, 8]),
      en,
    );
    expect(refiltered).toMatchObject({ kind: 'collection', action: 'updated', collectionId: 5 });
  });

  it('ignores a new asset until something uses it', () => {
    const asset = new Asset({ id: 11 });
    expect(changesFromEvent(new AssetEvent(ctx, asset, 'created'), en)).toEqual([]);
    const [updated] = changesFromEvent(new AssetEvent(ctx, asset, 'updated'), en);
    expect(updated).toMatchObject({ kind: 'asset', action: 'updated', assetId: 11 });
  });

  it('ignores events that do not touch the catalogue', () => {
    const order = new Order({ id: 1 });
    expect(
      changesFromEvent(new OrderPlacedEvent('ArrangingPayment', 'PaymentSettled', ctx, order), en),
    ).toEqual([]);
  });
});
