import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import { describe, expect, it } from 'vitest';
import { base64url, makePasskey } from './authenticator.ts';

const origin = 'http://localhost:8080';

/** Options as the gateway asks for them: discoverable, and the owner verified. */
const optionsFor = () =>
  generateRegistrationOptions({
    rpName: 'Deckle',
    rpID: 'localhost',
    userName: 'Collector',
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });

describe('makePasskey', () => {
  it('makes a passkey that SimpleWebAuthn verifies as the gateway does, its owner verified', async () => {
    const options = await optionsFor();
    const response = await makePasskey(options, origin);

    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response,
      expectedChallenge: options.challenge,
      expectedOrigin: origin,
      expectedRPID: 'localhost',
      requireUserVerification: true,
    });

    expect(verified).toBe(true);
    expect(registrationInfo?.credential.id).toBe(response.id);
    expect(registrationInfo?.userVerified).toBe(true);
  });

  it("takes the page's host for the relying party when the options name none", async () => {
    const { challenge } = await optionsFor();
    const response = await makePasskey({ challenge, rp: {} }, origin);

    const { verified } = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: 'localhost',
    });

    expect(verified).toBe(true);
  });

  it('makes a new credential each time, as a new person would', async () => {
    const options = await optionsFor();
    const [first, second] = await Promise.all([
      makePasskey(options, origin),
      makePasskey(options, origin),
    ]);
    expect(first.id).not.toBe(second.id);
  });

  it('is turned away by a gateway on another origin', async () => {
    const options = await optionsFor();
    const response = await makePasskey(options, origin);

    await expect(
      verifyRegistrationResponse({
        response,
        expectedChallenge: options.challenge,
        expectedOrigin: 'https://deckle.example',
        expectedRPID: 'localhost',
      }),
    ).rejects.toThrow(/origin/i);
  });
});

describe('base64url', () => {
  // RFC 4648's test vectors, without their padding.
  it.each([
    ['', ''],
    ['f', 'Zg'],
    ['fo', 'Zm8'],
    ['foo', 'Zm9v'],
    ['foob', 'Zm9vYg'],
    ['fooba', 'Zm9vYmE'],
    ['foobar', 'Zm9vYmFy'],
  ])('writes %j as %j', (text, expected) => {
    expect(base64url(new TextEncoder().encode(text))).toBe(expected);
  });

  it('uses the letters that are safe in a URL', () => {
    expect(base64url(Uint8Array.of(0xfb, 0xff))).toBe('-_8');
  });
});
