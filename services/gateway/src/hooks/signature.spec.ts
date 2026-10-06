import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { signatureHeader, verifySignature } from './signature.js';

const SECRET = 'commerce-hook-secret-for-the-test-suite';
const NOW = 1_791_000_000;
const BODY = Buffer.from('{"id":"6f1c2a5e-8b7d-4e3a-9c1f-2d4b6a8e0c13","type":"price"}');

const check = (
  header: string | string[] | undefined,
  overrides: { body?: Buffer; now?: number } = {},
) =>
  verifySignature({
    header,
    rawBody: overrides.body ?? BODY,
    secret: SECRET,
    nowSeconds: overrides.now ?? NOW,
  });

describe('verifySignature', () => {
  it('accepts the HMAC-SHA256 of "<t>.<raw body>" as lowercase hex', () => {
    const expected = createHmac('sha256', SECRET).update(`${NOW}.${BODY.toString()}`).digest('hex');

    expect(signatureHeader(BODY, SECRET, NOW)).toBe(`t=${NOW},v1=${expected}`);
    expect(check(`t=${NOW},v1=${expected}`)).toEqual({ valid: true });
  });

  it('accepts any of several v1 signatures, so the sender can rotate its secret', () => {
    const header = signatureHeader(BODY, SECRET, NOW);
    const rotated = header.replace('v1=', `v1=${'0'.repeat(64)},v1=`);
    expect(check(rotated)).toEqual({ valid: true });
  });

  it('allows five minutes either way and no more', () => {
    const signedAt = NOW - 300;
    expect(check(signatureHeader(BODY, SECRET, signedAt))).toEqual({ valid: true });
    expect(check(signatureHeader(BODY, SECRET, signedAt - 1))).toEqual({
      valid: false,
      reason: 'expired',
    });
    expect(check(signatureHeader(BODY, SECRET, NOW + 301))).toEqual({
      valid: false,
      reason: 'expired',
    });
  });

  it('rejects a body that changed, by a single byte', () => {
    const header = signatureHeader(BODY, SECRET, NOW);
    expect(check(header, { body: Buffer.from(BODY.toString().replace('price', 'stock')) })).toEqual(
      {
        valid: false,
        reason: 'mismatch',
      },
    );
  });

  it('rejects another secret', () => {
    expect(check(signatureHeader(BODY, 'another-secret-entirely', NOW))).toEqual({
      valid: false,
      reason: 'mismatch',
    });
  });

  it.each([
    ['missing', undefined],
    ['missing', ''],
    ['malformed', ['t=1,v1=00', 't=2,v1=00']],
    ['malformed', 'v1=abc'],
    ['malformed', `t=${NOW}`],
    ['malformed', `t=soon,v1=${'a'.repeat(64)}`],
    ['malformed', `t=${NOW},v1=${'a'.repeat(63)}`],
    ['malformed', `t=${NOW},v1=a=b`],
  ])('reports %s for %j', (reason, header) => {
    expect(check(header)).toEqual({ valid: false, reason });
  });

  it('cannot verify without the raw body', () => {
    const header = signatureHeader(BODY, SECRET, NOW);
    expect(
      verifySignature({ header, rawBody: undefined, secret: SECRET, nowSeconds: NOW }),
    ).toEqual({
      valid: false,
      reason: 'malformed',
    });
  });
});
