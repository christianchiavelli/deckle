import { Injectable } from '@nestjs/common';
import type { ShopProduct } from '../commerce/shop-api.responses.js';
import { ShopApiClient } from '../commerce/shop-api.client.js';
import { toArtwork } from './artwork.mapper.js';
import { encodeCursor, type PageWindow, pageWindow } from './cursor.js';
import type { Artwork } from './models/artwork.model.js';
import type { ArtworkConnection } from './models/artwork-connection.model.js';

interface PageRequest {
  readonly first: number;
  readonly after?: string | null;
  readonly collectionSlug?: string | null;
}

/** What one read of the list returned: the products found and where each sits. */
interface ListSlice {
  readonly totalItems: number;
  /** How many positions the read covered, found or not. */
  readonly covered: number;
  readonly entries: readonly { readonly offset: number; readonly product: ShopProduct }[];
}

@Injectable()
export class ArtworksService {
  constructor(private readonly shop: ShopApiClient) {}

  async page(request: PageRequest): Promise<ArtworkConnection> {
    const window = pageWindow(request.first, request.after);
    const slice =
      request.collectionSlug === null || request.collectionSlug === undefined
        ? await this.catalogueSlice(window)
        : await this.collectionSlice(request.collectionSlug, window);

    const edges = slice.entries.map(({ offset, product }) => ({
      cursor: encodeCursor(offset),
      node: toArtwork(product),
    }));
    return {
      edges,
      totalCount: slice.totalItems,
      pageInfo: {
        hasNextPage: window.skip + slice.covered < slice.totalItems,
        hasPreviousPage: window.skip > 0,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges.at(-1)?.cursor ?? null,
      },
    };
  }

  /** The works with these slugs, in the order asked, null where none exists: one Shop API call. */
  async bySlugs(slugs: readonly string[]): Promise<(Artwork | null)[]> {
    const products = await this.shop.productsBySlugs(slugs);
    const bySlug = new Map(products.map((product) => [product.slug, product]));
    return slugs.map((slug) => {
      const product = bySlug.get(slug);
      return product === undefined ? null : toArtwork(product);
    });
  }

  private async catalogueSlice(window: PageWindow): Promise<ListSlice> {
    const { totalItems, items } = await this.shop.listProducts(window);
    return {
      totalItems,
      covered: items.length,
      entries: items.map((product, index) => ({ offset: window.skip + index, product })),
    };
  }

  private async collectionSlice(collectionSlug: string, window: PageWindow): Promise<ListSlice> {
    const { totalItems, productIds } = await this.shop.collectionProductIds({
      collectionSlug,
      ...window,
    });
    const products = new Map(
      (await this.shop.productsByIds(productIds)).map((product) => [product.id, product]),
    );
    // The search index can still name a product disabled since it was indexed: its
    // position is kept, so the cursors of the works after it stay right.
    const entries = productIds.flatMap((id, index) => {
      const product = products.get(id);
      return product === undefined ? [] : [{ offset: window.skip + index, product }];
    });
    return { totalItems, covered: productIds.length, entries };
  }
}
