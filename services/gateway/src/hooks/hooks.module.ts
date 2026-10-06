import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { LiveModule } from '../live/live.module.js';
import { HookSignatureGuard } from './hook-signature.guard.js';
import { HooksController } from './hooks.controller.js';
import { HooksService } from './hooks.service.js';
import { PgWebhookDeliveries } from './pg-webhook-deliveries.js';
import { StoreRevalidator } from './store-revalidator.js';
import { WebhookDeliveries } from './webhook-deliveries.js';

@Module({
  imports: [DatabaseModule, LiveModule],
  controllers: [HooksController],
  providers: [
    HooksService,
    HookSignatureGuard,
    StoreRevalidator,
    { provide: WebhookDeliveries, useClass: PgWebhookDeliveries },
  ],
})
export class HooksModule {}
