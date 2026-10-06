import type { z } from 'zod';
import type { SqlExecutor } from '../../src/database/database.js';
import {
  type DeliveryKey,
  type DeliveryOutcome,
  WebhookDeliveries,
} from '../../src/hooks/webhook-deliveries.js';
import { SigningKeyStore, type StoredSigningKey } from '../../src/identity/signing-key.store.js';
import { PubSub } from '../../src/pubsub/pubsub.js';
import { TopicListeners } from '../../src/pubsub/topic-listeners.js';

/**
 * Stand-ins for the Postgres-backed seams, for tests about everything else.
 * The real implementations are tested against Postgres in the integration suite.
 */

export class InMemoryPubSub extends PubSub {
  readonly published: { topic: string; payload: unknown }[] = [];
  private readonly listeners = new TopicListeners();

  publish(topic: string, payload: unknown): Promise<void> {
    this.published.push({ topic, payload });
    // A round trip through JSON, as NOTIFY would make it.
    this.listeners.deliver(topic, JSON.parse(JSON.stringify(payload)));
    return Promise.resolve();
  }

  subscribe<T>(topic: string, payload: z.ZodType<T>): AsyncIterableIterator<T> {
    return this.listeners.subscribe(topic, payload);
  }

  isListening(): boolean {
    return true;
  }

  /** Open subscriptions, so a test can wait until one is in place before publishing. */
  get subscribers(): number {
    return this.listeners.size;
  }
}

export class InMemoryWebhookDeliveries extends WebhookDeliveries {
  readonly handled = new Set<string>();

  async once(
    delivery: DeliveryKey,
    work: (executor: SqlExecutor | undefined) => Promise<void>,
  ): Promise<DeliveryOutcome> {
    if (this.handled.has(delivery.id)) return 'duplicate';
    await work(undefined);
    this.handled.add(delivery.id);
    return 'processed';
  }
}

export class InMemorySigningKeyStore extends SigningKeyStore {
  readonly keys: StoredSigningKey[] = [];

  async ensureActiveKey(generate: () => Promise<StoredSigningKey>): Promise<StoredSigningKey> {
    const active = this.keys[0] ?? (await generate());
    if (this.keys.length === 0) this.keys.push(active);
    return active;
  }

  publishedKeys() {
    return Promise.resolve(this.keys.map((key) => key.publicJwk));
  }
}

/** What the health check asks of the pool. */
export function fakePool(healthy = true) {
  return {
    query: () =>
      healthy ? Promise.resolve({ rows: [] }) : Promise.reject(new Error('connection refused')),
    end: () => Promise.resolve(),
  };
}
