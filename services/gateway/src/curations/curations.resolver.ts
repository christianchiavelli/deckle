import { Logger } from '@nestjs/common';
import { Args, Context, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { slugSchema } from '../catalog/artworks.args.js';
import { Artwork } from '../catalog/models/artwork.model.js';
import { ArgsSchemaPipe } from '../graphql/args-schema.pipe.js';
import { crossService, listOf } from '../graphql/complexity.js';
import type { GatewayContext } from '../graphql/gateway-context.js';
import { Curation } from './curation.model.js';
import { CurationsService } from './curations.service.js';

/** Editors keep curations short; the cost estimate assumes no more than this many works. */
const CURATION_SIZE_ESTIMATE = 48;

@Resolver(() => Curation)
export class CurationsResolver {
  private readonly logger = new Logger(CurationsResolver.name);

  constructor(private readonly curationService: CurationsService) {}

  @Query(() => [Curation], {
    description: 'Every published curation, by title.',
    complexity: listOf(10),
  })
  curations() {
    return this.curationService.list();
  }

  @Query(() => Curation, { nullable: true, description: 'Null when no curation has this slug.' })
  curation(@Args('slug', { type: () => String }, new ArgsSchemaPipe(slugSchema)) slug: string) {
    return this.curationService.bySlug(slug);
  }

  @ResolveField(() => [Artwork], {
    description:
      'The works in the order the editor set. A work commerce no longer sells is left out.',
    complexity: (estimate) => crossService(estimate) + listOf(CURATION_SIZE_ESTIMATE)(estimate),
  })
  async artworks(
    @Parent() curation: Curation,
    @Context() context: GatewayContext,
  ): Promise<Artwork[]> {
    const loaded = await context.loaders.artworkBySlug.loadMany(curation.artworkSlugs);
    const artworks: Artwork[] = [];
    for (const [index, artwork] of loaded.entries()) {
      if (artwork instanceof Error) throw artwork;
      if (artwork === null) {
        this.logger.warn(
          `Curation "${curation.slug}" lists "${String(curation.artworkSlugs[index])}", which commerce does not sell`,
        );
      } else {
        artworks.push(artwork);
      }
    }
    return artworks;
  }
}
