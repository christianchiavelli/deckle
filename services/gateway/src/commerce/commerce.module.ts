import { Module } from '@nestjs/common';
import { AdminApiClient } from './admin-api.client.js';
import { ShopApiClient } from './shop-api.client.js';
import { ShopSessionClient } from './shop-session.client.js';

@Module({
  providers: [ShopApiClient, ShopSessionClient, AdminApiClient],
  exports: [ShopApiClient, ShopSessionClient, AdminApiClient],
})
export class CommerceModule {}
