import { Args, Context, Query, Resolver } from '@nestjs/graphql';
import { ArgsSchemaPipe } from '../graphql/args-schema.pipe.js';
import { DEFAULT_PAGE_SIZE, pageOf } from '../graphql/complexity.js';
import type { GatewayContext } from '../graphql/gateway-context.js';
import { ArtworksArgs, artworksArgsSchema, slugSchema } from './artworks.args.js';
import { ArtworksService } from './artworks.service.js';
import { Artwork } from './models/artwork.model.js';
import { ArtworkConnection } from './models/artwork-connection.model.js';

@Resolver(() => Artwork)
export class ArtworksResolver {
  constructor(private readonly artworkService: ArtworksService) {}

  @Query(() => ArtworkConnection, {
    description: 'The catalogue, a page at a time, ordered by title.',
    complexity: pageOf,
  })
  artworks(@Args(new ArgsSchemaPipe(artworksArgsSchema)) args: ArtworksArgs) {
    return this.artworkService.page({
      first: args.first ?? DEFAULT_PAGE_SIZE,
      after: args.after,
      collectionSlug: args.filter?.collection,
    });
  }

  @Query(() => Artwork, { nullable: true, description: 'Null when no artwork has this slug.' })
  artwork(
    @Args('slug', { type: () => String }, new ArgsSchemaPipe(slugSchema)) slug: string,
    @Context() context: GatewayContext,
  ) {
    return context.loaders.artworkBySlug.load(slug);
  }
}
