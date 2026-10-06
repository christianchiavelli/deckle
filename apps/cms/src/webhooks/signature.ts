import { createHmac } from 'node:crypto';

export const signatureHeader = 'Deckle-Signature';

/**
 * `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`, keyed with the
 * shared hook secret. The timestamp is inside the MAC, so the receiver can
 * refuse a replay older than its tolerance.
 */
export function signBody(secret: string, body: string, timestamp: number): string {
  const mac = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${mac}`;
}
