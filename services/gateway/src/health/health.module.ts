import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from '../database/database.module.js';
import { PubSubModule } from '../pubsub/pubsub.module.js';
import { HealthController } from './health.controller.js';
import { HealthIndicators } from './health.indicators.js';

@Module({
  imports: [TerminusModule.forRoot({ errorLogStyle: 'json' }), DatabaseModule, PubSubModule],
  controllers: [HealthController],
  providers: [HealthIndicators],
})
export class HealthModule {}
