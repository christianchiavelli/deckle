import { Injectable, Logger, Module } from '@nestjs/common';
import DataLoader from 'dataloader';
import { ArtworksService } from '../catalog/artworks.service.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { CmsClient } from '../cms/cms.client.js';
import { CmsModule } from '../cms/cms.module.js';
import { CommerceModule } from '../commerce/commerce.module.js';
import { ShopApiClient } from '../commerce/shop-api.client.js';
import { dropPageOf } from '../drops/drop-page.js';
import { StoriesModule } from '../stories/stories.module.js';
import { StoriesService } from '../stories/stories.service.js';
import type { RequestLoaders } from './gateway-context.js';

/** The upstreams cap a list read at 100 items; a bigger batch is split into several reads. */
const MAX_BATCH_SIZE = 100;

@Injectable()
export class RequestLoadersFactory {
  private readonly logger = new Logger(RequestLoadersFactory.name);

  constructor(
    private readonly artworks: ArtworksService,
    private readonly stories: StoriesService,
    private readonly cms: CmsClient,
    private readonly shop: ShopApiClient,
  ) {}

  /**
   * Fresh loaders for one operation. A query caches what it read for its own
   * duration; a subscription must not, because its context outlives every event
   * and a cached artwork would go stale between them.
   */
  create({ cache }: { cache: boolean }): RequestLoaders {
    const options = { cache, maxBatchSize: MAX_BATCH_SIZE };
    return {
      artworkBySlug: new DataLoader(
        (slugs: readonly string[]) => this.artworks.bySlugs(slugs),
        options,
      ),
      storyByArtworkSlug: new DataLoader(
        (slugs: readonly string[]) => this.stories.forArtworks(slugs),
        options,
      ),
      dropPageBySlug: new DataLoader(async (slugs: readonly string[]) => {
        const pages = new Map((await this.cms.dropPages(slugs)).map((page) => [page.slug, page]));
        return slugs.map((slug) => {
          const page = pages.get(slug);
          return page === undefined ? null : dropPageOf(page, this.logger);
        });
      }, options),
      editionByDrop: new DataLoader(async (slugs: readonly string[]) => {
        const editions = new Map(
          (await this.shop.editions(slugs)).map((edition) => [edition.slug, edition]),
        );
        return slugs.map((slug) => editions.get(slug) ?? null);
      }, options),
    };
  }
}

@Module({
  imports: [CatalogModule, StoriesModule, CmsModule, CommerceModule],
  providers: [RequestLoadersFactory],
  exports: [RequestLoadersFactory],
})
export class RequestLoadersModule {}
