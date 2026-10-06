import type { z } from 'zod';
import type { SqlExecutor } from '../database/database.js';

/**
 * Events that reach every subscriber, on every replica. Nest's in-memory PubSub
 * would only reach the replica that published, so this is backed by Postgres.
 */
export abstract class PubSub {
  /**
   * Sends `payload` (JSON) to everyone subscribed to `topic`. Given an open
   * transaction, the event is delivered only if that transaction commits.
   */
  abstract publish(topic: string, payload: unknown, executor?: SqlExecutor): Promise<void>;

  /** Events on `topic`, each checked against `payload`; malformed ones are dropped. */
  abstract subscribe<T>(topic: string, payload: z.ZodType<T>): AsyncIterableIterator<T>;

  /** Whether events are being received right now (false while reconnecting). */
  abstract isListening(): boolean;
}
