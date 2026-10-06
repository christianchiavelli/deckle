import { randomUUID } from 'node:crypto';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { JobQueueService, Logger, type JobQueue } from '@vendure/core';
import type { CatalogueChange } from './catalogue-changes.js';
import { ChangeBuffer } from './change-buffer.js';
import { CatalogueChangeResolver } from './change-resolver.js';
import { coalesce } from './coalesce.js';
import type { CatalogueHookBody } from './hook-contract.js';
import { deliverHook } from './hook-delivery.js';
import {
  CATALOGUE_HOOKS_OPTIONS,
  CATALOGUE_HOOKS_QUEUE,
  type CatalogueHooksOptions,
} from './options.js';

const loggerCtx = 'CatalogueHooks';

/**
 * Turns catalogue changes into signed webhooks for the gateway: buffers them, resolves
 * and coalesces each batch, and enqueues one job per hook. Every process enqueues;
 * only the worker delivers, retrying with backoff through Vendure's job queue.
 */
@Injectable()
export class CatalogueHooksService implements OnModuleInit {
  private queue: JobQueue<CatalogueHookBody> | undefined;
  private readonly buffer: ChangeBuffer<CatalogueChange>;

  constructor(
    private readonly jobQueueService: JobQueueService,
    private readonly resolver: CatalogueChangeResolver,
    @Inject(CATALOGUE_HOOKS_OPTIONS) private readonly options: CatalogueHooksOptions,
  ) {
    this.buffer = new ChangeBuffer<CatalogueChange>(
      options.coalesce,
      (batch) => this.enqueue(batch),
      (error, size) => {
        Logger.error(
          `Lost ${size} catalogue changes before they reached the queue: ${String(error)}`,
          loggerCtx,
          error instanceof Error ? error.stack : undefined,
        );
      },
    );
  }

  async onModuleInit(): Promise<void> {
    this.queue = await this.jobQueueService.createQueue<CatalogueHookBody>({
      name: CATALOGUE_HOOKS_QUEUE,
      process: async (job) => {
        const outcome = await deliverHook({
          url: this.options.hookUrl,
          secret: this.options.secret,
          body: job.data,
          timeoutMs: this.options.delivery.timeoutMs,
        });
        if (outcome.kind === 'rejected') {
          Logger.error(
            `The gateway refused hook ${job.data.id} (${job.data.type} ${job.data.action}) with ${outcome.status}; not retrying`,
            loggerCtx,
          );
        }
        return outcome;
      },
    });
  }

  record(changes: readonly CatalogueChange[]): void {
    this.buffer.add(changes);
  }

  /** Enqueues every change still in memory. */
  flush(): Promise<void> {
    return this.buffer.flush();
  }

  /**
   * For a process about to exit after writing to the catalogue, like the seed: waits
   * for the last events to arrive, then enqueues everything that is pending.
   */
  drain(): Promise<void> {
    return this.buffer.drain(this.options.coalesce.settleMs);
  }

  private async enqueue(batch: CatalogueChange[]): Promise<void> {
    const queue = this.queue;
    if (!queue) {
      throw new Error('The catalogue hooks queue is not created yet');
    }
    const notifications = coalesce(await this.resolver.resolve(batch, this.options.languageCode));
    for (const notification of notifications) {
      await queue.add(
        { ...notification, id: randomUUID(), source: 'commerce' },
        { retries: this.options.delivery.retries },
      );
    }
    Logger.verbose(
      `Enqueued ${notifications.length} hooks for ${batch.length} catalogue changes`,
      loggerCtx,
    );
  }

  /** Exposed for the plugin's tests and the seed's report. */
  get pendingChanges(): number {
    return this.buffer.size;
  }
}
