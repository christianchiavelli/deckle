import { Injectable } from '@nestjs/common';
import { ShopApiClient } from '../commerce/shop-api.client.js';
import type { Collection } from './models/collection.model.js';

@Injectable()
export class CollectionsService {
  constructor(private readonly shop: ShopApiClient) {}

  async list(): Promise<Collection[]> {
    const collections = await this.shop.collections();
    return collections.map(({ id, slug, name }) => ({ id, slug, name }));
  }

  async bySlug(slug: string): Promise<Collection | null> {
    const collection = await this.shop.collectionBySlug(slug);
    return collection === null
      ? null
      : { id: collection.id, slug: collection.slug, name: collection.name };
  }
}
