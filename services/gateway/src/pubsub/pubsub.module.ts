import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PgPubSub } from './pg-pubsub.js';
import { PubSub } from './pubsub.js';

@Module({
  imports: [DatabaseModule],
  providers: [{ provide: PubSub, useClass: PgPubSub }],
  exports: [PubSub],
})
export class PubSubModule {}
