import { describe, expect, it } from 'vitest';
import { artworkChangeFor, revalidationFor } from './hook-effects.js';
import { type HookEvent, cmsEventSchema, commerceEventSchema } from './hook-events.js';

const envelope = {
  id: '6f1c2a5e-8b7d-4e3a-9c1f-2d4b6a8e0c13',
  action: 'updated',
  occurredAt: '2026-10-05T12:00:00.000Z',
};
const variantSubject = { productId: 1, slug: 'melencolia-i', variantIds: [11, '12'] };

const commerce = (type: string, subject: unknown, action = 'updated') =>
  commerceEventSchema.parse({ ...envelope, action, source: 'commerce', type, subject });
const cms = (type: string, subject: unknown) =>
  cmsEventSchema.parse({ ...envelope, source: 'cms', type, subject });

describe('revalidationFor', () => {
  it.each<[string, HookEvent, string[], 'expire' | 'max']>([
    [
      'a product',
      commerce('product', { productId: '1', slug: 'melencolia-i' }),
      ['artwork:melencolia-i', 'catalog'],
      'expire',
    ],
    [
      'a variant',
      commerce('variant', variantSubject),
      ['artwork:melencolia-i', 'price:melencolia-i', 'stock:melencolia-i', 'catalog'],
      'expire',
    ],
    ['a price', commerce('price', variantSubject), ['price:melencolia-i', 'catalog'], 'expire'],
    ['stock', commerce('stock', variantSubject), ['stock:melencolia-i'], 'expire'],
    [
      'a collection',
      commerce('collection', { collectionId: 10, slug: 'prints' }),
      ['collection:prints', 'catalog'],
      'expire',
    ],
    ['an asset, which names no work', commerce('asset', { assetId: 3 }), ['catalog'], 'expire'],
    [
      'a story',
      cms('story', { slug: 'melencolia-i-story', artworkSlug: 'melencolia-i' }),
      ['story:melencolia-i'],
      'max',
    ],
    [
      'a curation',
      cms('curation', { slug: 'durer-and-the-occult' }),
      ['curation:durer-and-the-occult'],
      'max',
    ],
    ['a drop page', cms('drop-page', { slug: 'first-drop' }), ['drop-page:first-drop'], 'max'],
  ])('maps %s to its tags', (_name, event, tags, profile) => {
    expect(revalidationFor(event)).toEqual({ tags, profile });
  });
});

describe('artworkChangeFor', () => {
  it('announces product, variant, price and stock changes to the artwork they belong to', () => {
    expect(artworkChangeFor(commerce('price', variantSubject))).toEqual({
      slug: 'melencolia-i',
      kind: 'PRICE',
      action: 'UPDATED',
      occurredAt: envelope.occurredAt,
    });
    expect(
      artworkChangeFor(commerce('product', { productId: 1, slug: 'melencolia-i' }, 'deleted')),
    ).toMatchObject({
      kind: 'PRODUCT',
      action: 'DELETED',
    });
    expect(artworkChangeFor(commerce('variant', variantSubject, 'created'))).toMatchObject({
      kind: 'VARIANT',
      action: 'CREATED',
    });
    expect(artworkChangeFor(commerce('stock', variantSubject))).toMatchObject({ kind: 'STOCK' });
  });

  it('announces nothing for changes that are not about one artwork', () => {
    expect(
      artworkChangeFor(commerce('collection', { collectionId: 10, slug: 'prints' })),
    ).toBeNull();
    expect(artworkChangeFor(commerce('asset', { assetId: 3 }))).toBeNull();
    expect(artworkChangeFor(cms('story', { slug: 's', artworkSlug: 'melencolia-i' }))).toBeNull();
  });
});

describe('hook bodies', () => {
  it('read ids sent as numbers or strings as strings', () => {
    const event = commerce('variant', variantSubject);
    expect(event.subject).toEqual({
      productId: '1',
      slug: 'melencolia-i',
      variantIds: ['11', '12'],
    });
  });

  it('refuse a slug that could not be part of a cache tag', () => {
    const result = commerceEventSchema.safeParse({
      ...envelope,
      source: 'commerce',
      type: 'product',
      subject: { productId: 1, slug: 'two words' },
    });
    expect(result.success).toBe(false);
  });
});
