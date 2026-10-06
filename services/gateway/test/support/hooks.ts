import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { signatureHeader } from '../../src/hooks/signature.js';
import type { ListeningGateway } from './test-app.js';

/** A delivery as commerce would send it, with overrides for the fields a test cares about. */
export function commerceEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    source: 'commerce',
    type: 'price',
    action: 'updated',
    occurredAt: '2026-10-05T12:00:00.000Z',
    subject: { productId: 1, slug: 'melencolia-i', variantIds: [11] },
    ...overrides,
  };
}

export function cmsEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    source: 'cms',
    type: 'story',
    action: 'updated',
    occurredAt: '2026-10-05T12:00:00.000Z',
    subject: { slug: 'melencolia-i-story', artworkSlug: 'melencolia-i' },
    ...overrides,
  };
}

interface Delivery {
  readonly secret: string;
  /** Unix seconds the signature claims; now by default. */
  readonly signedAt?: number;
  /** Signs these bytes instead of the body sent, to model tampering. */
  readonly signedBody?: string;
}

/** POSTs `body` to a hook route, signed the way the services sign it. */
export function deliver(
  target: Pick<ListeningGateway, 'app'>,
  path: string,
  body: unknown,
  delivery: Delivery,
) {
  const raw = JSON.stringify(body);
  const signature = signatureHeader(
    Buffer.from(delivery.signedBody ?? raw),
    delivery.secret,
    delivery.signedAt ?? Date.now() / 1000,
  );
  return request(target.app.getHttpServer())
    .post(path)
    .set({ 'content-type': 'application/json', 'deckle-signature': signature })
    .send(raw);
}
