import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import {
  calculateJwkThumbprint,
  type CryptoKey,
  exportJWK,
  generateKeyPair,
  importJWK,
  type JWK,
} from 'jose';
import { SigningKeyStore, type StoredSigningKey } from './signing-key.store.js';

/** EdDSA over Ed25519: small keys and signatures, and no parameters to get wrong. */
export const SIGNING_ALGORITHM = 'EdDSA';

/** How long a replica signs with the key it read before reading again, to notice a rotation. */
const ACTIVE_KEY_TTL_MS = 5 * 60 * 1000;

export interface SigningKey {
  readonly kid: string;
  readonly key: CryptoKey;
}

/** A fresh Ed25519 key pair, its id the RFC 7638 thumbprint of its public half. */
export async function generateSigningKey(): Promise<StoredSigningKey> {
  const { publicKey, privateKey } = await generateKeyPair(SIGNING_ALGORITHM, {
    crv: 'Ed25519',
    extractable: true,
  });
  const publicJwk = await exportJWK(publicKey);
  const kid = await calculateJwkThumbprint(publicJwk);
  return {
    kid,
    algorithm: SIGNING_ALGORITHM,
    publicJwk: { ...publicJwk, kid, alg: SIGNING_ALGORITHM, use: 'sig' },
    privateJwk: { ...(await exportJWK(privateKey)), kid, alg: SIGNING_ALGORITHM },
  };
}

@Injectable()
export class SigningKeys implements OnApplicationBootstrap {
  private readonly logger = new Logger(SigningKeys.name);
  private active: { readonly signingKey: SigningKey; readonly readAt: number } | null = null;

  constructor(private readonly store: SigningKeyStore) {}

  /** The first start creates the first key; every start fails here if the keys cannot be read. */
  async onApplicationBootstrap() {
    const { kid } = await this.current();
    this.logger.log(`Signing commerce tokens with key ${kid}`);
  }

  async current(): Promise<SigningKey> {
    if (this.active !== null && Date.now() - this.active.readAt < ACTIVE_KEY_TTL_MS) {
      return this.active.signingKey;
    }
    const stored = await this.store.ensureActiveKey(generateSigningKey);
    const key = await importJWK(stored.privateJwk, stored.algorithm);
    if (key instanceof Uint8Array)
      throw new Error(`Signing key ${stored.kid} is not an asymmetric key`);
    const signingKey = { kid: stored.kid, key };
    this.active = { signingKey, readAt: Date.now() };
    return signingKey;
  }

  async jwks(): Promise<{ keys: JWK[] }> {
    return { keys: await this.store.publishedKeys() };
  }
}
