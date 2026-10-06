import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { SqlExecutor } from '../database/database.js';
import { PubSub } from '../pubsub/pubsub.js';
import { ArtworkChangeKind, ChangeAction } from './artwork-change.model.js';

/** What travels between replicas: small, and well under the NOTIFY limit. */
export const artworkChangeMessage = z.object({
  slug: z.string().min(1),
  kind: z.enum(ArtworkChangeKind),
  action: z.enum(ChangeAction),
  occurredAt: z.iso.datetime({ offset: true }),
});

export type ArtworkChangeMessage = z.output<typeof artworkChangeMessage>;

const topicFor = (slug: string) => `artwork-changed:${slug}`;

@Injectable()
export class ArtworkEvents {
  constructor(private readonly pubsub: PubSub) {}

  publish(change: ArtworkChangeMessage, executor?: SqlExecutor): Promise<void> {
    return this.pubsub.publish(topicFor(change.slug), change, executor);
  }

  changes(slug: string): AsyncIterableIterator<ArtworkChangeMessage> {
    return this.pubsub.subscribe(topicFor(slug), artworkChangeMessage);
  }
}
