import { Injectable, Module } from '@nestjs/common';
import DataLoader from 'dataloader';
import { ArtworksService } from '../catalog/artworks.service.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { StoriesModule } from '../stories/stories.module.js';
import { StoriesService } from '../stories/stories.service.js';
import type { RequestLoaders } from './gateway-context.js';

/** The upstreams cap a list read at 100 items; a bigger batch is split into several reads. */
const MAX_BATCH_SIZE = 100;

@Injectable()
export class RequestLoadersFactory {
  constructor(
    private readonly artworks: ArtworksService,
    private readonly stories: StoriesService,
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
    };
  }
}

@Module({
  imports: [CatalogModule, StoriesModule],
  providers: [RequestLoadersFactory],
  exports: [RequestLoadersFactory],
})
export class RequestLoadersModule {}
