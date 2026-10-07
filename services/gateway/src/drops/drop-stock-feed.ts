import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { AsyncQueue } from '../pubsub/async-queue.js';
import { DropEvents, type DropChangeMessage } from './drop-events.js';
import { type DropStock, DropStore } from './drop-store.js';

/**
 * How long a burst of changes is gathered before the stock is read: a thousand
 * claims in a second cost each replica a handful of reads, not a thousand per
 * watcher.
 */
export const GATHER_MS = 150;

/** A watcher only ever needs the latest stock; older ones are dropped. */
const WATCHER_BACKLOG = 2;

interface Watch {
  readonly watchers: Set<AsyncQueue<DropStock>>;
  readonly changes: AsyncIterableIterator<DropChangeMessage>;
  timer: NodeJS.Timeout | null;
}

/**
 * The live count. Events say only which drop changed; on each burst of them a
 * replica reads the drop's stock once and hands it to every watcher it holds,
 * so the numbers come from the database, never from a sum kept in memory.
 */
@Injectable()
export class DropStockFeed implements OnApplicationShutdown {
  private readonly logger = new Logger(DropStockFeed.name);
  private readonly watches = new Map<string, Watch>();

  constructor(
    private readonly events: DropEvents,
    private readonly store: DropStore,
  ) {}

  /** The drop's stock each time it changes, until the watcher goes away. */
  watch(slug: string): AsyncIterableIterator<DropStock> {
    const watch = this.watches.get(slug) ?? this.open(slug);
    const queue = new AsyncQueue<DropStock>(WATCHER_BACKLOG, () => {
      this.leave(slug, queue);
    });
    watch.watchers.add(queue);
    return queue;
  }

  onApplicationShutdown() {
    for (const watch of this.watches.values()) {
      for (const queue of watch.watchers) queue.close();
    }
  }

  private open(slug: string): Watch {
    const watch: Watch = { watchers: new Set(), changes: this.events.changes(slug), timer: null };
    this.watches.set(slug, watch);
    void (async () => {
      // Which change it was does not matter: any of them means read the stock again.
      while (!(await watch.changes.next()).done) {
        watch.timer ??= setTimeout(() => {
          watch.timer = null;
          void this.send(slug, watch);
        }, GATHER_MS);
      }
    })();
    return watch;
  }

  private async send(slug: string, watch: Watch) {
    try {
      const stock = (await this.store.stock([slug])).get(slug);
      if (stock === undefined) return;
      for (const queue of watch.watchers) queue.push(stock);
    } catch (error) {
      this.logger.warn(
        `Could not read the stock of ${slug} for its watchers: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private leave(slug: string, queue: AsyncQueue<DropStock>) {
    const watch = this.watches.get(slug);
    if (watch === undefined) return;
    watch.watchers.delete(queue);
    if (watch.watchers.size > 0) return;
    this.watches.delete(slug);
    if (watch.timer !== null) clearTimeout(watch.timer);
    // Ends the loop above and lets go of the topic on this replica.
    void watch.changes.return?.();
  }
}
