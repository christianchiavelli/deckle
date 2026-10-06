import { Injectable } from '@nestjs/common';
import {
  CollectionTranslation,
  Logger,
  ProductTranslation,
  ProductVariant,
  ProductVariantPrice,
  TransactionalConnection,
  type ID,
  type LanguageCode,
} from '@vendure/core';
import { In } from 'typeorm';
import type { CatalogueChange, VariantRef } from './catalogue-changes.js';
import type { ResolvedChange } from './coalesce.js';

const loggerCtx = 'CatalogueHooks';

/** Picks the shop language's slug out of all the translations of each entity. */
function slugsByBase(
  rows: readonly { base: { id: ID }; languageCode: LanguageCode; slug: string }[],
  languageCode: LanguageCode,
): Map<string, string> {
  const slugs = new Map<string, string>();
  for (const row of rows) {
    const key = String(row.base.id);
    if (row.languageCode === languageCode || !slugs.has(key)) {
      slugs.set(key, row.slug);
    }
  }
  return slugs;
}

/**
 * Fills in what the events left out, in a handful of queries however many events
 * there were: a price's variant, a variant's product, a product's or collection's
 * slug. Soft-deleted products and variants keep their rows, so a deletion still
 * resolves; a collection is deleted for good, and its event carries the slug.
 */
@Injectable()
export class CatalogueChangeResolver {
  constructor(private readonly connection: TransactionalConnection) {}

  async resolve(
    changes: readonly CatalogueChange[],
    languageCode: LanguageCode,
  ): Promise<ResolvedChange[]> {
    const variantProducts = await this.variantProducts(changes);
    const productSlugs = await this.productSlugs(changes, variantProducts, languageCode);
    const collectionSlugs = await this.collectionSlugs(changes, languageCode);

    const resolved: ResolvedChange[] = [];
    for (const change of changes) {
      switch (change.kind) {
        case 'product': {
          const productId = String(change.productId);
          const slug = change.slug ?? productSlugs.get(productId);
          if (slug === undefined) {
            Logger.warn(`Skipped a product change: product ${productId} has no slug`, loggerCtx);
            break;
          }
          resolved.push({ type: 'product', action: change.action, at: change.at, productId, slug });
          break;
        }
        case 'variants': {
          const byProduct = new Map<string, string[]>();
          for (const ref of change.refs) {
            const located = variantProducts.get(refKey(ref));
            if (located === undefined) {
              continue;
            }
            byProduct.set(located.productId, [
              ...(byProduct.get(located.productId) ?? []),
              located.variantId,
            ]);
          }
          for (const [productId, variantIds] of byProduct) {
            const slug = productSlugs.get(productId);
            if (slug === undefined) {
              Logger.warn(
                `Skipped a ${change.type} change: product ${productId} has no slug`,
                loggerCtx,
              );
              continue;
            }
            resolved.push({
              type: change.type,
              action: change.action,
              at: change.at,
              productId,
              slug,
              variantIds,
            });
          }
          break;
        }
        case 'collection': {
          const collectionId = String(change.collectionId);
          const slug = change.slug ?? collectionSlugs.get(collectionId);
          if (slug === undefined) {
            Logger.warn(
              `Skipped a collection change: collection ${collectionId} has no slug`,
              loggerCtx,
            );
            break;
          }
          resolved.push({
            type: 'collection',
            action: change.action,
            at: change.at,
            collectionId,
            slug,
          });
          break;
        }
        case 'asset':
          resolved.push({
            type: 'asset',
            action: change.action,
            at: change.at,
            assetId: String(change.assetId),
          });
          break;
      }
    }
    return resolved;
  }

  /** Every variant reference, keyed by `refKey`, mapped to its variant and product. */
  private async variantProducts(
    changes: readonly CatalogueChange[],
  ): Promise<Map<string, { variantId: string; productId: string }>> {
    const refs = changes.flatMap((change) => (change.kind === 'variants' ? change.refs : []));
    const located = new Map<string, { variantId: string; productId: string }>();

    const priceIds = refs.flatMap((ref) => ('priceId' in ref ? [ref.priceId] : []));
    const priceVariants = new Map<string, ID>();
    if (priceIds.length > 0) {
      const prices = await this.connection.rawConnection.getRepository(ProductVariantPrice).find({
        where: { id: In(priceIds) },
        relations: { variant: true },
      });
      for (const price of prices) {
        priceVariants.set(String(price.id), price.variant.id);
      }
    }

    const unknownProduct = new Set<ID>();
    for (const ref of refs) {
      if ('priceId' in ref) {
        const variantId = priceVariants.get(String(ref.priceId));
        if (variantId !== undefined) {
          unknownProduct.add(variantId);
        }
      } else if (ref.productId === null) {
        unknownProduct.add(ref.variantId);
      }
    }
    const productOfVariant = new Map<string, string>();
    if (unknownProduct.size > 0) {
      const variants = await this.connection.rawConnection.getRepository(ProductVariant).find({
        select: { id: true, productId: true },
        where: { id: In([...unknownProduct]) },
      });
      for (const variant of variants) {
        productOfVariant.set(String(variant.id), String(variant.productId));
      }
    }

    for (const ref of refs) {
      if ('priceId' in ref) {
        const variantId = priceVariants.get(String(ref.priceId));
        const productId =
          variantId === undefined ? undefined : productOfVariant.get(String(variantId));
        if (variantId !== undefined && productId !== undefined) {
          located.set(refKey(ref), { variantId: String(variantId), productId });
        }
      } else {
        const productId =
          ref.productId === null
            ? productOfVariant.get(String(ref.variantId))
            : String(ref.productId);
        if (productId !== undefined) {
          located.set(refKey(ref), { variantId: String(ref.variantId), productId });
        }
      }
    }
    return located;
  }

  private async productSlugs(
    changes: readonly CatalogueChange[],
    variantProducts: ReadonlyMap<string, { productId: string }>,
    languageCode: LanguageCode,
  ): Promise<Map<string, string>> {
    const ids = new Set<string>();
    for (const change of changes) {
      if (change.kind === 'product' && change.slug === null) {
        ids.add(String(change.productId));
      }
    }
    for (const { productId } of variantProducts.values()) {
      ids.add(productId);
    }
    if (ids.size === 0) {
      return new Map();
    }
    const rows = await this.connection.rawConnection.getRepository(ProductTranslation).find({
      select: { id: true, slug: true, languageCode: true, base: { id: true } },
      relations: { base: true },
      where: { base: { id: In([...ids]) } },
    });
    return slugsByBase(rows, languageCode);
  }

  private async collectionSlugs(
    changes: readonly CatalogueChange[],
    languageCode: LanguageCode,
  ): Promise<Map<string, string>> {
    const ids = changes.flatMap((change) =>
      change.kind === 'collection' && change.slug === null ? [String(change.collectionId)] : [],
    );
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.connection.rawConnection.getRepository(CollectionTranslation).find({
      select: { id: true, slug: true, languageCode: true, base: { id: true } },
      relations: { base: true },
      where: { base: { id: In(ids) } },
    });
    return slugsByBase(rows, languageCode);
  }
}

function refKey(ref: VariantRef): string {
  return 'priceId' in ref ? `price:${String(ref.priceId)}` : `variant:${String(ref.variantId)}`;
}
