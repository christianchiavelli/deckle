import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { lt, sql } from 'drizzle-orm';
import { DATABASE, type Database, type SqlExecutor } from '../database/database.js';
import { webhookDeliveries } from './webhook-deliveries.table.js';
import { type DeliveryKey, type DeliveryOutcome, WebhookDeliveries } from './webhook-deliveries.js';

/** Longer than any sender keeps retrying, so a late redelivery is still recognised. */
const RETENTION = sql`interval '7 days'`;
const PURGE_EVERY_MS = 60 * 60 * 1000;

@Injectable()
export class PgWebhookDeliveries
  extends WebhookDeliveries
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PgWebhookDeliveries.name);
  private purgeTimer: NodeJS.Timeout | null = null;

  constructor(@Inject(DATABASE) private readonly db: Database) {
    super();
  }

  /**
   * The insert and the work share one transaction. A concurrent duplicate's insert
   * waits on the primary key until this one commits, then sees the conflict and
   * skips; if this one rolls back instead, the duplicate goes ahead and does the work.
   */
  once(
    delivery: DeliveryKey,
    work: (executor: SqlExecutor | undefined) => Promise<void>,
  ): Promise<DeliveryOutcome> {
    return this.db.transaction(async (transaction) => {
      const claimed = await transaction
        .insert(webhookDeliveries)
        .values({ id: delivery.id, source: delivery.source, type: delivery.type })
        .onConflictDoNothing()
        .returning({ id: webhookDeliveries.id });
      if (claimed.length === 0) return 'duplicate';
      await work(transaction);
      return 'processed';
    });
  }

  /** Forgets deliveries past the retention window; every replica may run it, it is idempotent. */
  async purgeExpired(): Promise<number> {
    const result = await this.db
      .delete(webhookDeliveries)
      .where(lt(webhookDeliveries.receivedAt, sql`now() - ${RETENTION}`));
    return result.rowCount ?? 0;
  }

  onApplicationBootstrap() {
    void this.purge();
    this.purgeTimer = setInterval(() => void this.purge(), PURGE_EVERY_MS).unref();
  }

  onApplicationShutdown() {
    if (this.purgeTimer !== null) clearInterval(this.purgeTimer);
  }

  private async purge() {
    try {
      const forgotten = await this.purgeExpired();
      if (forgotten > 0) this.logger.log(`Forgot ${forgotten} expired webhook deliveries`);
    } catch (error) {
      this.logger.warn(
        `Purging old webhook deliveries failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
