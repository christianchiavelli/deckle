import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Viewer } from '../accounts/viewer.model.js';
import { listOf } from '../graphql/complexity.js';
import { DropCopy } from './drop.model.js';
import { DropsService } from './drops.service.js';

@Resolver(() => Viewer)
export class ViewerCopiesResolver {
  constructor(private readonly drops: DropsService) {}

  @ResolveField(() => [DropCopy], {
    description: 'The copies this account holds or has bought, the first claimed first.',
    complexity: listOf(4),
  })
  copies(@Parent() viewer: Viewer): Promise<DropCopy[]> {
    return this.drops.copiesOf(viewer.id);
  }
}
