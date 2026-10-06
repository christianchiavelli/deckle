import { Args, Context, Parent, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { slugSchema } from '../catalog/artworks.args.js';
import { Artwork } from '../catalog/models/artwork.model.js';
import { ArgsSchemaPipe } from '../graphql/args-schema.pipe.js';
import type { GatewayContext } from '../graphql/gateway-context.js';
import { ArtworkChange } from './artwork-change.model.js';
import { ArtworkEvents, type ArtworkChangeMessage } from './artwork-events.js';

@Resolver(() => ArtworkChange)
export class ArtworkChangesResolver {
  constructor(private readonly events: ArtworkEvents) {}

  @Subscription(() => ArtworkChange, {
    description: 'Changes commerce makes to one artwork, from whichever replica hears of them.',
    resolve: (message: ArtworkChangeMessage): ArtworkChange => ({
      ...message,
      occurredAt: new Date(message.occurredAt),
    }),
  })
  artworkChanged(
    @Args('slug', { type: () => String }, new ArgsSchemaPipe(slugSchema)) slug: string,
  ) {
    return this.events.changes(slug);
  }

  @ResolveField(() => Artwork, {
    nullable: true,
    description: 'The artwork as it is now; null once it is deleted.',
  })
  artwork(@Parent() change: ArtworkChange, @Context() context: GatewayContext) {
    return change.action === 'DELETED' ? null : context.loaders.artworkBySlug.load(change.slug);
  }
}
