import type { CatalogueNotification, HookAction } from './hook-contract.js';

/** A change with its ids resolved to what the webhook subject needs. */
export type ResolvedChange =
  | { type: 'product'; action: HookAction; at: Date; productId: string; slug: string }
  | {
      type: 'variant' | 'price' | 'stock';
      action: HookAction;
      at: Date;
      productId: string;
      slug: string;
      variantIds: string[];
    }
  | { type: 'collection'; action: HookAction; at: Date; collectionId: string; slug: string }
  | { type: 'asset'; action: HookAction; at: Date; assetId: string };

const typeOrder: Record<ResolvedChange['type'], number> = {
  product: 0,
  variant: 1,
  price: 2,
  stock: 3,
  collection: 4,
  asset: 5,
};

/** A deletion outlives everything; a creation outlives the updates that followed it. */
const actionRank: Record<HookAction, number> = { updated: 0, created: 1, deleted: 2 };

function keyOf(change: ResolvedChange): string {
  switch (change.type) {
    case 'product':
    case 'variant':
    case 'price':
    case 'stock':
      return `${change.type}:${change.productId}`;
    case 'collection':
      return `collection:${change.collectionId}`;
    case 'asset':
      return `asset:${change.assetId}`;
  }
}

const byNumericId = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true });

const variantIdsOf = (change: ResolvedChange) => ('variantIds' in change ? change.variantIds : []);

/** Two changes under one key: the latest names it, the strongest action wins. */
function merge(into: ResolvedChange, next: ResolvedChange): ResolvedChange {
  const action = actionRank[next.action] > actionRank[into.action] ? next.action : into.action;
  const latest = next.at > into.at ? next : into;
  if ('variantIds' in latest) {
    const variantIds = [...new Set([...variantIdsOf(into), ...variantIdsOf(next)])];
    return { ...latest, action, variantIds: variantIds.sort(byNumericId) };
  }
  return { ...latest, action };
}

/**
 * Turns a burst of changes into the fewest notifications that still tell the gateway
 * everything: one per entity and type, and nothing about the variants, prices or
 * stock of a product that was created or deleted in the same burst, since the
 * product notification already makes the gateway drop everything it holds for it.
 * A seed's thousands of events come out as about one notification per work.
 */
export function coalesce(changes: readonly ResolvedChange[]): CatalogueNotification[] {
  const merged = new Map<string, ResolvedChange>();
  for (const change of changes) {
    const key = keyOf(change);
    const existing = merged.get(key);
    merged.set(key, existing ? merge(existing, change) : change);
  }

  const replacedProducts = new Set(
    [...merged.values()].flatMap((change) =>
      change.type === 'product' && change.action !== 'updated' ? [change.productId] : [],
    ),
  );

  return [...merged.values()]
    .filter(
      (change) =>
        !(
          (change.type === 'variant' || change.type === 'price' || change.type === 'stock') &&
          replacedProducts.has(change.productId)
        ),
    )
    .sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || byNumericId(keyOf(a), keyOf(b)))
    .map(toNotification);
}

function toNotification(change: ResolvedChange): CatalogueNotification {
  const occurredAt = change.at.toISOString();
  switch (change.type) {
    case 'product':
      return {
        type: 'product',
        action: change.action,
        occurredAt,
        subject: { productId: change.productId, slug: change.slug },
      };
    case 'variant':
    case 'price':
    case 'stock':
      return {
        type: change.type,
        action: change.action,
        occurredAt,
        subject: { productId: change.productId, slug: change.slug, variantIds: change.variantIds },
      };
    case 'collection':
      return {
        type: 'collection',
        action: change.action,
        occurredAt,
        subject: { collectionId: change.collectionId, slug: change.slug },
      };
    case 'asset':
      return {
        type: 'asset',
        action: change.action,
        occurredAt,
        subject: { assetId: change.assetId },
      };
  }
}
