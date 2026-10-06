import { createHmac } from 'node:crypto';

/**
 * The webhook contract between commerce and the gateway (BRIEF, "Webhooks"):
 * `POST` JSON, signed in a `Deckle-Signature` header, delivered at least once and
 * made idempotent on the receiving side by `id`.
 */

export type HookAction = 'created' | 'updated' | 'deleted';

// Object type literals rather than interfaces: the body is job data, which Vendure
// requires to be JSON-compatible, and only literals carry an implicit index signature.
export type CatalogueNotification =
  | {
      type: 'product';
      action: HookAction;
      occurredAt: string;
      subject: { productId: string; slug: string };
    }
  | {
      type: 'variant' | 'price' | 'stock';
      action: HookAction;
      occurredAt: string;
      subject: { productId: string; slug: string; variantIds: string[] };
    }
  | {
      type: 'collection';
      action: HookAction;
      occurredAt: string;
      subject: { collectionId: string; slug: string };
    }
  | { type: 'asset'; action: HookAction; occurredAt: string; subject: { assetId: string } };

export type CatalogueHookBody = CatalogueNotification & { id: string; source: 'commerce' };

export const SIGNATURE_HEADER = 'Deckle-Signature';

/**
 * `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`. Signed per attempt,
 * so a retry hours later still falls inside the receiver's five-minute tolerance.
 */
export function signatureHeader(secret: string, rawBody: string, unixSeconds: number): string {
  const digest = createHmac('sha256', secret).update(`${unixSeconds}.${rawBody}`).digest('hex');
  return `t=${unixSeconds},v1=${digest}`;
}
