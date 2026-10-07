import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from 'node:crypto';
import { isoBase64URL, isoCBOR } from '@simplewebauthn/server/helpers';

/** What the gateway sends as JSON for `navigator.credentials.create()`. */
interface CreationOptions {
  readonly challenge: string;
  readonly rp: { readonly id?: string };
  readonly user: { readonly id: string };
}

interface RequestOptions {
  readonly challenge: string;
  readonly rpId?: string;
}

const FLAGS = { userPresent: 0x01, userVerified: 0x04, attestedData: 0x40 } as const;

/** What the CBOR encoder takes. */
type CBORValue = Parameters<typeof isoCBOR.encode>[0];

const b64 = (bytes: Uint8Array) => isoBase64URL.fromBuffer(Uint8Array.from(bytes));
const sha256 = (data: Uint8Array | string) => createHash('sha256').update(data).digest();

/**
 * A passkey device in software, for the API tests: it makes an ES256 key per
 * credential and answers WebAuthn ceremonies the way a phone or a laptop does,
 * with `none` attestation and its owner verified. The browser end is tested
 * with Playwright's virtual authenticator instead.
 */
export class SoftAuthenticator {
  private readonly credentials = new Map<
    string,
    { readonly key: KeyObject; readonly userHandle: string; counter: number }
  >();

  constructor(private readonly origin: string) {}

  /** The answer to a registration's options, as `@simplewebauthn/browser` would send it. */
  register(optionsJson: string): string {
    const options = JSON.parse(optionsJson) as CreationOptions;
    const rpId = options.rp.id ?? new URL(this.origin).hostname;
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const id = randomBytes(16);
    const credentialId = b64(id);
    this.credentials.set(credentialId, {
      key: privateKey,
      userHandle: options.user.id,
      counter: 0,
    });

    const jwk = publicKey.export({ format: 'jwk' });
    const coseKey = isoCBOR.encode(
      new Map<number, number | Uint8Array>([
        [1, 2],
        [3, -7],
        [-1, 1],
        [-2, isoBase64URL.toBuffer(jwk.x ?? '')],
        [-3, isoBase64URL.toBuffer(jwk.y ?? '')],
      ]),
    );
    const length = Buffer.alloc(2);
    length.writeUInt16BE(id.length);
    const authData = Buffer.concat([
      sha256(rpId),
      Buffer.from([FLAGS.userPresent | FLAGS.userVerified | FLAGS.attestedData]),
      Buffer.alloc(4),
      Buffer.alloc(16),
      length,
      id,
      Buffer.from(coseKey),
    ]);
    const attestationObject = isoCBOR.encode(
      new Map<string, CBORValue>([
        ['fmt', 'none'],
        ['attStmt', new Map<string, CBORValue>()],
        ['authData', Uint8Array.from(authData)],
      ]),
    );
    return JSON.stringify({
      id: credentialId,
      rawId: credentialId,
      type: 'public-key',
      response: {
        clientDataJSON: this.clientData('webauthn.create', options.challenge),
        attestationObject: b64(attestationObject),
        transports: ['internal'],
      },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform',
    });
  }

  /** The answer to a sign-in's options with the passkey `credentialId`, or the only one there is. */
  signIn(optionsJson: string, credentialId?: string): string {
    const options = JSON.parse(optionsJson) as RequestOptions;
    const rpId = options.rpId ?? new URL(this.origin).hostname;
    const id = credentialId ?? [...this.credentials.keys()][0] ?? '';
    const credential = this.credentials.get(id);
    if (credential === undefined) throw new Error(`No passkey ${id} on this authenticator`);
    credential.counter += 1;
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(credential.counter);
    const authData = Buffer.concat([
      sha256(rpId),
      Buffer.from([FLAGS.userPresent | FLAGS.userVerified]),
      counter,
    ]);
    const clientDataJSON = this.clientData('webauthn.get', options.challenge);
    const signature = sign(
      'sha256',
      Buffer.concat([authData, sha256(isoBase64URL.toBuffer(clientDataJSON))]),
      credential.key,
    );
    return JSON.stringify({
      id,
      rawId: id,
      type: 'public-key',
      response: {
        clientDataJSON,
        authenticatorData: b64(authData),
        signature: b64(signature),
        userHandle: credential.userHandle,
      },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform',
    });
  }

  private clientData(type: string, challenge: string): string {
    return b64(
      Buffer.from(JSON.stringify({ type, challenge, origin: this.origin, crossOrigin: false })),
    );
  }
}
