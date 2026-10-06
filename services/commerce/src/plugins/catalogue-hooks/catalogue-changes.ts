import {
  AssetEvent,
  CollectionEvent,
  CollectionModificationEvent,
  ProductChannelEvent,
  ProductEvent,
  ProductVariantChannelEvent,
  ProductVariantEvent,
  ProductVariantPriceEvent,
  StockMovementEvent,
  type ID,
  type LanguageCode,
  type VendureEvent,
} from '@vendure/core';
import type { HookAction } from './hook-contract.js';

/**
 * What one Vendure event says changed in the catalogue, before ids are resolved to
 * slugs. An event often lacks what the webhook needs (a price knows its variant, not
 * the product's slug), so the gaps are filled in one batch when the buffer flushes.
 */
export type VariantRef = { variantId: ID; productId: ID | null } | { priceId: ID };

export type CatalogueChange =
  | { kind: 'product'; action: HookAction; at: Date; productId: ID; slug: string | null }
  | {
      kind: 'variants';
      type: 'variant' | 'price' | 'stock';
      action: HookAction;
      at: Date;
      refs: VariantRef[];
    }
  | { kind: 'collection'; action: HookAction; at: Date; collectionId: ID; slug: string | null }
  | { kind: 'asset'; action: HookAction; at: Date; assetId: ID };

/** The events that change what the store shows, in the order they are subscribed. */
export const catalogueEventTypes = [
  ProductEvent,
  ProductChannelEvent,
  ProductVariantEvent,
  ProductVariantChannelEvent,
  ProductVariantPriceEvent,
  StockMovementEvent,
  CollectionEvent,
  CollectionModificationEvent,
  AssetEvent,
] as const;

export type CatalogueEvent = InstanceType<(typeof catalogueEventTypes)[number]>;

interface Translatable {
  translations?: readonly { languageCode: LanguageCode; slug?: string }[];
}

/*
 * Entities as events carry them. Vendure types every column and relation as present,
 * but an event holds whatever its service had loaded: an updated price comes without
 * its variant, and a stock movement's variant is often a bare `{ id }`. Reading
 * through these shapes makes each gap a value the code has to handle.
 */
interface CarriedVariant {
  id: ID;
  productId?: ID | null;
}

interface CarriedPrice {
  id: ID;
  variant?: CarriedVariant | null;
}

interface CarriedMovement {
  productVariant?: CarriedVariant | null;
}

const refOf = (variant: CarriedVariant): VariantRef => ({
  variantId: variant.id,
  productId: variant.productId ?? null,
});

/**
 * The slug in the shop's language, from the translations Vendure loads eagerly with
 * products and collections. A collection is deleted for good, so this is the only
 * place its slug survives.
 */
function slugOf(entity: Translatable, languageCode: LanguageCode): string | null {
  const translations = entity.translations ?? [];
  const translation =
    translations.find((candidate) => candidate.languageCode === languageCode) ?? translations[0];
  return translation?.slug ?? null;
}

const fromChannel = (type: 'assigned' | 'removed'): HookAction =>
  type === 'assigned' ? 'created' : 'deleted';

export function changesFromEvent(
  event: CatalogueEvent | VendureEvent,
  languageCode: LanguageCode,
): CatalogueChange[] {
  const at = event.createdAt;
  if (event instanceof ProductEvent) {
    return [
      {
        kind: 'product',
        action: event.type,
        at,
        productId: event.entity.id,
        slug: slugOf(event.entity, languageCode),
      },
    ];
  }
  if (event instanceof ProductChannelEvent) {
    return [
      {
        kind: 'product',
        action: fromChannel(event.type),
        at,
        productId: event.product.id,
        slug: slugOf(event.product, languageCode),
      },
    ];
  }
  if (event instanceof ProductVariantEvent) {
    const variants: readonly CarriedVariant[] = event.entity;
    return [
      { kind: 'variants', type: 'variant', action: event.type, at, refs: variants.map(refOf) },
    ];
  }
  if (event instanceof ProductVariantChannelEvent) {
    return [
      {
        kind: 'variants',
        type: 'variant',
        action: fromChannel(event.type),
        at,
        refs: [refOf(event.productVariant)],
      },
    ];
  }
  if (event instanceof ProductVariantPriceEvent) {
    // A new price arrives with its variant; an updated one was loaded without it.
    const prices: readonly CarriedPrice[] = event.entity;
    const refs = prices.map((price): VariantRef =>
      price.variant ? refOf(price.variant) : { priceId: price.id },
    );
    return [{ kind: 'variants', type: 'price', action: event.type, at, refs }];
  }
  if (event instanceof StockMovementEvent) {
    const movements: readonly CarriedMovement[] = event.stockMovements;
    const refs = movements.flatMap((movement) =>
      movement.productVariant ? [refOf(movement.productVariant)] : [],
    );
    return refs.length > 0
      ? [{ kind: 'variants', type: 'stock', action: 'updated', at, refs }]
      : [];
  }
  if (event instanceof CollectionEvent) {
    return [
      {
        kind: 'collection',
        action: event.type,
        at,
        collectionId: event.entity.id,
        slug: slugOf(event.entity, languageCode),
      },
    ];
  }
  if (event instanceof CollectionModificationEvent) {
    // Its products changed, which is all the store needs to know about the collection.
    return [
      {
        kind: 'collection',
        action: 'updated',
        at,
        collectionId: event.collection.id,
        slug: slugOf(event.collection, languageCode),
      },
    ];
  }
  if (event instanceof AssetEvent) {
    // A new asset shows nowhere until a product or collection uses it, and that
    // change sends its own hook.
    return event.type === 'created'
      ? []
      : [{ kind: 'asset', action: event.type, at, assetId: event.entity.id }];
  }
  return [];
}
