import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { SqlExecutor } from '../database/database.js';
import { PubSub } from '../pubsub/pubsub.js';

/** Says which drop changed, never its numbers: each replica reads those once per burst. */
export const dropChangeMessage = z.object({ slug: z.string().min(1) });

export type DropChangeMessage = z.output<typeof dropChangeMessage>;

const topicFor = (slug: string) => `drop-changed:${slug}`;

/** A claim, a release, a sale or a lapsed hold, heard by every replica. */
@Injectable()
export class DropEvents {
  constructor(private readonly pubsub: PubSub) {}

  /** Given the transaction that made the change, it is told only if that commits. */
  changed(slug: string, executor?: SqlExecutor): Promise<void> {
    return this.pubsub.publish(topicFor(slug), { slug }, executor);
  }

  changes(slug: string): AsyncIterableIterator<DropChangeMessage> {
    return this.pubsub.subscribe(topicFor(slug), dropChangeMessage);
  }
}
