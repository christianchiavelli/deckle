import { Module } from '@nestjs/common';
import { CmsModule } from '../cms/cms.module.js';
import { CurationsResolver } from './curations.resolver.js';
import { CurationsService } from './curations.service.js';

@Module({
  imports: [CmsModule],
  providers: [CurationsService, CurationsResolver],
})
export class CurationsModule {}
