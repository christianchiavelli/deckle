import { Module } from '@nestjs/common';
import { AdminApiClient } from './admin-api.client.js';
import { ShopApiClient } from './shop-api.client.js';

@Module({
  providers: [ShopApiClient, AdminApiClient],
  exports: [ShopApiClient, AdminApiClient],
})
export class CommerceModule {}
