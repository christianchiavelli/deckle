import type { SqlExecutor } from '../database/database.js';

export interface DeliveryKey {
  readonly id: string;
  readonly source: string;
  readonly type: string;
}

export type DeliveryOutcome = 'processed' | 'duplicate';

/**
 * Remembers which deliveries were handled. Senders deliver at least once, so the
 * same event can arrive twice, even twice at the same moment on two replicas.
 */
export abstract class WebhookDeliveries {
  /**
   * Runs `work` unless a delivery with this id was handled already. The record
   * and the work commit together: if `work` throws, the delivery is not
   * recorded, the sender is told to retry, and the retry runs it again.
   */
  abstract once(
    delivery: DeliveryKey,
    work: (executor: SqlExecutor | undefined) => Promise<void>,
  ): Promise<DeliveryOutcome>;
}
