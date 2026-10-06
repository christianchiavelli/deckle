import { Module } from '@nestjs/common';
import { CmsClient } from './cms.client.js';

@Module({
  providers: [CmsClient],
  exports: [CmsClient],
})
export class CmsModule {}
