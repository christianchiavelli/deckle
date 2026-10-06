import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Artwork } from '../catalog/models/artwork.model.js';
import { crossService } from '../graphql/complexity.js';
import type { GatewayContext } from '../graphql/gateway-context.js';
import { Story } from './story.model.js';

/** Adds the CMS's story to the commerce artwork; the catalogue itself knows nothing of the CMS. */
@Resolver(() => Artwork)
export class ArtworkStoryResolver {
  @ResolveField(() => Story, {
    nullable: true,
    description: 'Null when the CMS has no story for this work.',
    complexity: crossService,
  })
  story(@Parent() artwork: Artwork, @Context() context: GatewayContext) {
    return context.loaders.storyByArtworkSlug.load(artwork.slug);
  }
}
