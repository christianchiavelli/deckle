import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ArgsSchemaPipe } from '../graphql/args-schema.pipe.js';
import { DEFAULT_PAGE_SIZE, listOf, pageOf } from '../graphql/complexity.js';
import { PageArgs, pageArgsSchema, slugSchema } from './artworks.args.js';
import { ArtworksService } from './artworks.service.js';
import { CollectionsService } from './collections.service.js';
import { ArtworkConnection } from './models/artwork-connection.model.js';
import { Collection } from './models/collection.model.js';

@Resolver(() => Collection)
export class CollectionsResolver {
  constructor(
    private readonly collectionService: CollectionsService,
    private readonly artworkService: ArtworksService,
  ) {}

  @Query(() => [Collection], {
    description: 'The commerce taxonomy, in the order commerce keeps it.',
    complexity: listOf(20),
  })
  collections() {
    return this.collectionService.list();
  }

  @Query(() => Collection, {
    nullable: true,
    description: 'Null when no collection has this slug.',
  })
  collection(@Args('slug', { type: () => String }, new ArgsSchemaPipe(slugSchema)) slug: string) {
    return this.collectionService.bySlug(slug);
  }

  @ResolveField(() => ArtworkConnection, {
    description: 'The works in this collection, ordered by title.',
    complexity: pageOf,
  })
  artworks(
    @Parent() collection: Collection,
    @Args(new ArgsSchemaPipe(pageArgsSchema)) args: PageArgs,
  ) {
    return this.artworkService.page({
      first: args.first ?? DEFAULT_PAGE_SIZE,
      after: args.after,
      collectionSlug: collection.slug,
    });
  }
}
