import { DROPS, opensAt } from '@deckle/drops';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { DropStore } from './drop-store.js';

/**
 * Records the drops the stack opens with, the first time the gateway starts
 * against its database: one drop open at once, one to come. A drop already
 * recorded keeps its opening time and its sales, whatever restarts.
 */
@Injectable()
export class DropSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(DropSeeder.name);

  constructor(private readonly store: DropStore) {}

  async onApplicationBootstrap() {
    const now = new Date();
    const recorded = await this.store.record(
      DROPS.map((drop) => ({
        slug: drop.slug,
        artworkSlug: drop.artworkSlug,
        editionSize: drop.editionSize,
        opensAt: opensAt(drop, now),
      })),
    );
    for (const slug of recorded) this.logger.log(`Recorded the drop ${slug}`);
  }
}
