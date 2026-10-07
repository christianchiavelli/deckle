import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PgSessionStore } from './pg-session-store.js';
import { SessionStore } from './session-store.js';
import { SessionSweeper } from './session-sweeper.js';
import { Sessions } from './sessions.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [Sessions, SessionSweeper, { provide: SessionStore, useClass: PgSessionStore }],
  exports: [Sessions],
})
export class SessionsModule {}
