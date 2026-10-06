import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ArtworkEvents } from '../live/artwork-events.js';
import { UpstreamError } from '../upstream/upstream-errors.js';
import { artworkChangeFor, revalidationFor } from './hook-effects.js';
import type { HookEvent } from './hook-events.js';
import { StoreRevalidator } from './store-revalidator.js';
import { WebhookDeliveries } from './webhook-deliveries.js';

@Injectable()
export class HooksService {
  private readonly logger = new Logger(HooksService.name);

  constructor(
    private readonly deliveries: WebhookDeliveries,
    private readonly store: StoreRevalidator,
    private readonly artworkEvents: ArtworkEvents,
  ) {}

  /**
   * Revalidates the store and tells subscribers, once per delivery id. The
   * `artworkChanged` notification goes out in the same transaction that records
   * the delivery, so subscribers hear of a change exactly when it is recorded.
   */
  async handle(event: HookEvent): Promise<void> {
    const revalidation = revalidationFor(event);
    const change = artworkChangeFor(event);
    try {
      const outcome = await this.deliveries.once(event, async (executor) => {
        await this.store.revalidate(revalidation);
        if (change !== null) await this.artworkEvents.publish(change, executor);
      });
      this.logger.log(
        outcome === 'duplicate' ? 'Skipped a repeated delivery' : 'Handled a delivery',
        {
          id: event.id,
          source: event.source,
          type: event.type,
          action: event.action,
          tags: revalidation.tags,
        },
      );
    } catch (error) {
      // Nothing was recorded, so a retry will do the whole job.
      if (error instanceof UpstreamError) {
        this.logger.warn(`Delivery ${event.id} will need a retry: ${error.message}`);
        throw new ServiceUnavailableException('The store could not be revalidated; retry later', {
          cause: error,
        });
      }
      throw error;
    }
  }
}
