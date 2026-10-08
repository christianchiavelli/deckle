import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { type Cbor, encodeCbor } from './cbor.ts';

/** What a device reads from the gateway's registration options. */
export interface CreationOptions {
  readonly challenge: string;
  readonly rp: { readonly id?: string };
}

// Authenticator data flags (WebAuthn §6.1): the owner was there, was verified,
// and a new credential follows.
const USER_PRESENT = 0x01;
const USER_VERIFIED = 0x04;
const ATTESTED_CREDENTIAL = 0x40;

// A COSE_Key (RFC 9053) for an ES256 public key: its labels, then their values.
const KEY_TYPE = 1;
const ALGORITHM = 3;
const CURVE = -1;
const X = -2;
const Y = -3;
const EC2 = 2;
const ES256 = -7;
const P256 = 1;

/**
 * Makes a passkey as a phone or a laptop would, in software: a new P-256 key,
 * attested as "none", with its owner present and verified. The gateway checks
 * it exactly as it checks a real device's answer; nothing in it says a test
 * made it.
 */
export async function makePasskey(
  options: CreationOptions,
  origin: string,
): Promise<RegistrationResponseJSON> {
  const rpId = options.rp.id ?? new URL(origin).hostname;
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  // An uncompressed point: 0x04, then x and y, 32 bytes each.
  const point = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const credentialId = crypto.getRandomValues(new Uint8Array(16));
  const publicKey = encodeCbor(
    new Map<number, Cbor>([
      [KEY_TYPE, EC2],
      [ALGORITHM, ES256],
      [CURVE, P256],
      [X, point.slice(1, 33)],
      [Y, point.slice(33, 65)],
    ]),
  );
  const authenticatorData = concat([
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rpId))),
    Uint8Array.of(USER_PRESENT | USER_VERIFIED | ATTESTED_CREDENTIAL),
    // The signature counter, which a passkey that syncs leaves at zero.
    new Uint8Array(4),
    // The AAGUID, all zeros: no model to name.
    new Uint8Array(16),
    Uint8Array.of(credentialId.length >>> 8, credentialId.length & 0xff),
    credentialId,
    publicKey,
  ]);
  const attestationObject = encodeCbor(
    new Map<string, Cbor>([
      ['fmt', 'none'],
      ['attStmt', new Map()],
      ['authData', authenticatorData],
    ]),
  );
  const clientData = new TextEncoder().encode(
    JSON.stringify({
      type: 'webauthn.create',
      challenge: options.challenge,
      origin,
      crossOrigin: false,
    }),
  );
  const id = base64url(credentialId);
  return {
    id,
    rawId: id,
    type: 'public-key',
    response: {
      clientDataJSON: base64url(clientData),
      attestationObject: base64url(attestationObject),
      transports: ['internal'],
    },
    clientExtensionResults: {},
    authenticatorAttachment: 'platform',
  };
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Base64url without padding (RFC 4648 §5), as WebAuthn's JSON writes bytes. */
export function base64url(bytes: Uint8Array): string {
  let text = '';
  for (let start = 0; start < bytes.length; start += 3) {
    let bits = 0;
    for (let offset = 0; offset < 3; offset += 1) {
      bits = (bits << 8) | (bytes[start + offset] ?? 0);
    }
    // Four letters for three bytes, and one fewer for each byte the last group lacks.
    const letters = Math.min(3, bytes.length - start) + 1;
    for (let place = 0; place < letters; place += 1) {
      text += ALPHABET.charAt((bits >>> (18 - 6 * place)) & 63);
    }
  }
  return text;
}
