import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { GraphQLClient } from '../upstream/graphql-client.js';
import {
  ARTWORK_PRODUCTS,
  COLLECTION_BY_SLUG,
  COLLECTION_PRODUCT_IDS,
  COLLECTIONS,
} from './shop-api.documents.js';
import {
  collectionBySlugSchema,
  collectionProductIdsSchema,
  collectionsSchema,
  productListSchema,
  type ShopCollection,
  type ShopProduct,
} from './shop-api.responses.js';

export interface ProductPage {
  readonly totalItems: number;
  readonly items: readonly ShopProduct[];
}

export interface ProductIdPage {
  readonly totalItems: number;
  readonly productIds: readonly string[];
}

const SHOP_API_TIMEOUT_MS = 5000;

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
      variables: { options: { ...page, sort: { name: 'ASC' } } },
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

  private async productsWhere(filter: Record<string, unknown>, count: number) {
    if (count === 0) return [];
    const { products } = await this.graphql.query({
      operationName: 'ArtworkProducts',
      document: ARTWORK_PRODUCTS,
      variables: { options: { filter, take: count } },
      data: productListSchema,
    });
    return products.items;
  }
}
