import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { repeat, type Repeating } from '../scheduling/repeat.js';
import { SessionStore } from './session-store.js';

/** Sessions nobody came back to are deleted, along with the ceremonies they had begun. */
const SWEEP_EVERY_MS = 10 * 60 * 1000;

@Injectable()
export class SessionSweeper implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(SessionSweeper.name);
  private sweeping: Repeating | null = null;

  constructor(private readonly store: SessionStore) {}

  onApplicationBootstrap() {
    this.sweeping = repeat(
      'Deleting expired sessions',
      SWEEP_EVERY_MS,
      async () => {
        const deleted = await this.store.deleteExpired();
        if (deleted > 0) this.logger.log(`Deleted ${deleted} expired session(s)`);
      },
      this.logger,
    );
  }

  async onApplicationShutdown() {
    await this.sweeping?.stop();
  }
}
