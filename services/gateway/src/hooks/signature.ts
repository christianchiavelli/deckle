import { createHmac, timingSafeEqual } from 'node:crypto';

/** How old a signature may be. Past it, a captured delivery can no longer be replayed. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export const SIGNATURE_HEADER = 'deckle-signature';

export type SignatureCheck =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: 'missing' | 'malformed' | 'expired' | 'mismatch' };

interface SignatureInput {
  readonly header: string | readonly string[] | undefined;
  readonly rawBody: Buffer | undefined;
  readonly secret: string;
  readonly nowSeconds: number;
}

function digest(secret: string, timestamp: string, rawBody: Buffer) {
  return createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest();
}

/**
 * Checks `Deckle-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`.
 * The HMAC covers the exact bytes received, so the body is verified before it is
 * parsed. Several `v1` entries are accepted, which lets a sender sign with an old
 * and a new secret while the secret rotates.
 */
export function verifySignature({
  header,
  rawBody,
  secret,
  nowSeconds,
}: SignatureInput): SignatureCheck {
  if (header === undefined || header === '') return { valid: false, reason: 'missing' };
  if (typeof header !== 'string' || rawBody === undefined)
    return { valid: false, reason: 'malformed' };

  let timestamp: string | undefined;
  const signatures: Buffer[] = [];
  for (const part of header.split(',')) {
    const [key, value, ...rest] = part.trim().split('=');
    if (rest.length > 0 || value === undefined) return { valid: false, reason: 'malformed' };
    if (key === 't' && /^\d{1,12}$/.test(value)) timestamp = value;
    else if (key === 'v1' && /^[0-9a-f]{64}$/i.test(value))
      signatures.push(Buffer.from(value, 'hex'));
  }
  if (timestamp === undefined || signatures.length === 0)
    return { valid: false, reason: 'malformed' };

  if (Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) {
    return { valid: false, reason: 'expired' };
  }

  const expected = digest(secret, timestamp, rawBody);
  const matches = signatures.some((signature) => timingSafeEqual(signature, expected));
  return matches ? { valid: true } : { valid: false, reason: 'mismatch' };
}

/** The header a sender attaches; the tests sign with it, and it documents the scheme. */
export function signatureHeader(rawBody: Buffer, secret: string, nowSeconds: number): string {
  const timestamp = String(Math.floor(nowSeconds));
  return `t=${timestamp},v1=${digest(secret, timestamp, rawBody).toString('hex')}`;
}
