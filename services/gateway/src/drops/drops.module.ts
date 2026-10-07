import { Module } from '@nestjs/common';
import { CommerceModule } from '../commerce/commerce.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { PubSubModule } from '../pubsub/pubsub.module.js';
import { DropEvents } from './drop-events.js';
import { DropSeeder } from './drop-seeder.js';
import { DropStockFeed } from './drop-stock-feed.js';
import { DropStore } from './drop-store.js';
import { DropSweeper } from './drop-sweeper.js';
import { DropsResolver } from './drops.resolver.js';
import { DropsService } from './drops.service.js';
import { PgDropStore } from './pg-drop-store.js';
import { ViewerCopiesResolver } from './viewer-copies.resolver.js';

@Module({
  imports: [DatabaseModule, PubSubModule, CommerceModule, IdentityModule],
  providers: [
    DropEvents,
    DropsService,
    DropStockFeed,
    DropSeeder,
    DropSweeper,
    DropsResolver,
    ViewerCopiesResolver,
    { provide: DropStore, useClass: PgDropStore },
  ],
})
export class DropsModule {}
