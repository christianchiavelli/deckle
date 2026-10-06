import { Logger } from '@nestjs/common';
import type { z } from 'zod';
import { AsyncQueue } from './async-queue.js';

/** Unread events a subscriber may fall behind by before the oldest are dropped. */
const SUBSCRIBER_BACKLOG = 64;

/**
 * This replica's subscribers, by topic. Whatever the transport, delivering an
 * event to the subscriptions open here is the same: parse it, queue it.
 */
export class TopicListeners {
  private readonly logger = new Logger(TopicListeners.name);
  private readonly listeners = new Map<string, Set<(payload: unknown) => void>>();

  subscribe<T>(topic: string, schema: z.ZodType<T>): AsyncQueue<T> {
    const queue = new AsyncQueue<T>(
      SUBSCRIBER_BACKLOG,
      () => {
        this.remove(topic, listener);
      },
      () => {
        this.logger.warn(`A subscriber to ${topic} fell behind; its oldest event was dropped`);
      },
    );
    const listener = (payload: unknown) => {
      const parsed = schema.safeParse(payload);
      if (parsed.success) {
        queue.push(parsed.data);
      } else {
        this.logger.warn(`Dropped a malformed event on ${topic}: ${parsed.error.message}`);
      }
    };
    const listeners = this.listeners.get(topic) ?? new Set();
    listeners.add(listener);
    this.listeners.set(topic, listeners);
    return queue;
  }

  deliver(topic: string, payload: unknown): void {
    for (const listener of this.listeners.get(topic) ?? []) listener(payload);
  }

  get size(): number {
    let size = 0;
    for (const listeners of this.listeners.values()) size += listeners.size;
    return size;
  }

  private remove(topic: string, listener: (payload: unknown) => void) {
    const listeners = this.listeners.get(topic);
    listeners?.delete(listener);
    if (listeners?.size === 0) this.listeners.delete(topic);
  }
}
