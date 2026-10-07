import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { repeat, type Repeating } from '../scheduling/repeat.js';
import { DropStore } from './drop-store.js';

/**
 * How often lapsed holds are opened again. A claim already treats a lapsed hold
 * as open by the database's clock; the sweep is what tells everyone watching
 * that the copy came back, so the live count is at most this late.
 */
export const SWEEP_EVERY_MS = 1000;

/** Every replica sweeps; `SKIP LOCKED` keeps them, and any payment under way, out of each other's way. */
@Injectable()
export class DropSweeper implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(DropSweeper.name);
  private sweeping: Repeating | null = null;

  constructor(private readonly store: DropStore) {}

  onApplicationBootstrap() {
    this.sweeping = repeat(
      'Opening lapsed holds',
      SWEEP_EVERY_MS,
      async () => {
        await this.store.releaseExpired();
      },
      this.logger,
    );
  }

  async onApplicationShutdown() {
    await this.sweeping?.stop();
  }
}
