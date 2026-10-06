import { Module } from '@nestjs/common';
import { PubSubModule } from '../pubsub/pubsub.module.js';
import { ArtworkChangesResolver } from './artwork-changes.resolver.js';
import { ArtworkEvents } from './artwork-events.js';

@Module({
  imports: [PubSubModule],
  providers: [ArtworkEvents, ArtworkChangesResolver],
  exports: [ArtworkEvents],
})
export class LiveModule {}
