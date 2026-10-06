import { describe, expect, it } from 'vitest';
import { coalesce, type ResolvedChange } from './coalesce.js';

const at = (second: number) => new Date(Date.UTC(2026, 9, 5, 12, 0, second));

const product = (
  productId: string,
  action: ResolvedChange['action'],
  second = 0,
): ResolvedChange => ({
  type: 'product',
  action,
  at: at(second),
  productId,
  slug: `work-${productId}`,
});

const variants = (
  type: 'variant' | 'price' | 'stock',
  productId: string,
  variantIds: string[],
  second = 0,
): ResolvedChange => ({
  type,
  action: 'updated',
  at: at(second),
  productId,
  slug: `work-${productId}`,
  variantIds,
});

describe('coalesce', () => {
  it('sends one notification per entity and type, at the time of the last change', () => {
    const notifications = coalesce([
      product('3', 'updated', 1),
      product('3', 'updated', 4),
      variants('price', '3', ['8'], 2),
      variants('price', '3', ['7', '10'], 3),
    ]);
    expect(notifications).toEqual([
      {
        type: 'product',
        action: 'updated',
        occurredAt: at(4).toISOString(),
        subject: { productId: '3', slug: 'work-3' },
      },
      {
        type: 'price',
        action: 'updated',
        occurredAt: at(3).toISOString(),
        subject: { productId: '3', slug: 'work-3', variantIds: ['7', '8', '10'] },
      },
    ]);
  });

  it('keeps the strongest action: a deletion over everything, a creation over updates', () => {
    const [created] = coalesce([product('3', 'created', 1), product('3', 'updated', 2)]);
    const [deleted] = coalesce([
      product('3', 'updated', 1),
      product('3', 'deleted', 2),
      product('3', 'updated', 3),
    ]);
    expect(created?.action).toBe('created');
    expect(deleted?.action).toBe('deleted');
  });

  it('takes the latest slug when a change renames the entity', () => {
    const renamed = { ...product('3', 'updated', 2), slug: 'melencolia' };
    const [notification] = coalesce([renamed, product('3', 'updated', 1)]);
    expect(notification?.subject).toEqual({ productId: '3', slug: 'melencolia' });
  });

  it('drops variant, price and stock news for a product created or deleted in the same burst', () => {
    const notifications = coalesce([
      product('3', 'created'),
      variants('variant', '3', ['7']),
      variants('price', '3', ['7']),
      product('4', 'deleted'),
      variants('stock', '4', ['9']),
      variants('stock', '5', ['11']),
    ]);
    expect(notifications.map(({ type, subject }) => `${type} ${JSON.stringify(subject)}`)).toEqual([
      'product {"productId":"3","slug":"work-3"}',
      'product {"productId":"4","slug":"work-4"}',
      'stock {"productId":"5","slug":"work-5","variantIds":["11"]}',
    ]);
  });

  it('orders the burst by type, then by numeric id', () => {
    const notifications = coalesce([
      { type: 'asset', action: 'updated', at: at(0), assetId: '2' },
      { type: 'collection', action: 'created', at: at(0), collectionId: '10', slug: 'woodcuts' },
      { type: 'collection', action: 'created', at: at(0), collectionId: '9', slug: 'engravings' },
      product('12', 'updated'),
      product('3', 'updated'),
    ]);
    expect(
      notifications.map(({ type, subject }) => `${type} ${String(Object.values(subject)[0])}`),
    ).toEqual(['product 3', 'product 12', 'collection 9', 'collection 10', 'asset 2']);
  });

  it('sends nothing for nothing', () => {
    expect(coalesce([])).toEqual([]);
  });
});
