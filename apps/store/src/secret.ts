import { timingSafeEqual } from 'node:crypto';

/** Whether `given` is the secret, compared in constant time so the comparison tells nothing. */
export function sameSecret(given: string, secret: string): boolean {
  const presented = Buffer.from(given);
  const expected = Buffer.from(secret);
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}
