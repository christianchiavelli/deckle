import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { GraphQLClient } from '../upstream/graphql-client.js';
import {
  ARTWORK_PRODUCTS,
  COLLECTION_BY_SLUG,
  COLLECTION_PRODUCT_IDS,
  COLLECTIONS,
  EDITIONS,
} from './shop-api.documents.js';
import {
  collectionBySlugSchema,
  collectionProductIdsSchema,
  collectionsSchema,
  editionsSchema,
  productListSchema,
  type ShopCollection,
  type ShopProduct,
} from './shop-api.responses.js';

export interface ProductPage {
  readonly totalItems: number;
  readonly items: readonly ShopProduct[];
}

/** A drop's edition as commerce sells it: the variant to order, and its price. */
export interface Edition {
  readonly slug: string;
  readonly variantId: string;
  /** Minor units, taxes included. */
  readonly price: number;
  readonly currencyCode: string;
  readonly editionSize: number;
}

export interface ProductIdPage {
  readonly totalItems: number;
  readonly productIds: readonly string[];
}

const SHOP_API_TIMEOUT_MS = 5000;

/**
 * Only works: a drop's numbered edition is a product too, but it has no Met
 * record of its own, and the drop reads it by its slug.
 */
const WORKS_ONLY = { metObjectId: { isNull: false } } as const;

/** The storefront side of commerce: the catalogue as any visitor may read it. */
@Injectable()
export class ShopApiClient {
  private readonly graphql: GraphQLClient;

  constructor(config: ConfigService<Env, true>) {
    this.graphql = new GraphQLClient({
      service: 'commerce',
      url: config.get('COMMERCE_SHOP_API_URL', { infer: true }),
      timeoutMs: SHOP_API_TIMEOUT_MS,
    });
  }

  async listProducts(page: { skip: number; take: number }): Promise<ProductPage> {
    const { products } = await this.graphql.query({
      operationName: 'ArtworkProducts',
      document: ARTWORK_PRODUCTS,
      variables: { options: { ...page, sort: { name: 'ASC' }, filter: WORKS_ONLY } },
      data: productListSchema,
    });
    return products;
  }

  async productsByIds(ids: readonly string[]): Promise<readonly ShopProduct[]> {
    return this.productsWhere({ id: { in: ids } }, ids.length);
  }

  async productsBySlugs(slugs: readonly string[]): Promise<readonly ShopProduct[]> {
    return this.productsWhere({ slug: { in: slugs } }, slugs.length);
  }

  async collectionProductIds(page: {
    collectionSlug: string;
    skip: number;
    take: number;
  }): Promise<ProductIdPage> {
    const { search } = await this.graphql.query({
      operationName: 'CollectionProductIds',
      document: COLLECTION_PRODUCT_IDS,
      variables: { input: { ...page, groupByProduct: true, sort: { name: 'ASC' } } },
      data: collectionProductIdsSchema,
    });
    return {
      totalItems: search.totalItems,
      productIds: search.items.map((item) => item.productId),
    };
  }

  async collections(): Promise<readonly ShopCollection[]> {
    const { collections } = await this.graphql.query({
      operationName: 'Collections',
      document: COLLECTIONS,
      data: collectionsSchema,
    });
    return collections.items;
  }

  async collectionBySlug(slug: string): Promise<ShopCollection | null> {
    const { collection } = await this.graphql.query({
      operationName: 'CollectionBySlug',
      document: COLLECTION_BY_SLUG,
      variables: { slug },
      data: collectionBySlugSchema,
    });
    return collection;
  }

  /** The editions of these drops that commerce sells, by the drops' slugs: one call. */
  async editions(slugs: readonly string[]): Promise<readonly Edition[]> {
    if (slugs.length === 0) return [];
    const { products } = await this.graphql.query({
      operationName: 'Editions',
      document: EDITIONS,
      variables: { options: { filter: { slug: { in: slugs } }, take: slugs.length } },
      data: editionsSchema,
    });
    return products.items.flatMap((product) =>
      product.variants.flatMap((variant) =>
        variant.customFields.editionSize === null
          ? []
          : [
              {
                slug: product.slug,
                variantId: variant.id,
                price: variant.priceWithTax,
                currencyCode: variant.currencyCode,
                editionSize: variant.customFields.editionSize,
              },
            ],
      ),
    );
  }

  private async productsWhere(filter: Record<string, unknown>, count: number) {
    if (count === 0) return [];
    const { products } = await this.graphql.query({
      operationName: 'ArtworkProducts',
      document: ARTWORK_PRODUCTS,
      variables: { options: { filter: { ...filter, ...WORKS_ONLY }, take: count } },
      data: productListSchema,
    });
    return products.items;
  }
}
