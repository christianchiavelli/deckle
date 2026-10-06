import { Module } from '@nestjs/common';
import { CmsModule } from '../cms/cms.module.js';
import { ArtworkStoryResolver } from './artwork-story.resolver.js';
import { StoriesService } from './stories.service.js';

@Module({
  imports: [CmsModule],
  providers: [StoriesService, ArtworkStoryResolver],
  exports: [StoriesService],
})
export class StoriesModule {}
