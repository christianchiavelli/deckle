import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { SIGNING_ALGORITHM, SigningKeys } from './signing-keys.service.js';

export const COMMERCE_TOKEN = {
  issuer: 'deckle-gateway',
  audience: 'deckle-commerce',
  /** Used once, at once, to open a commerce session; the contract allows at most 60 s. */
  lifetimeSeconds: 30,
} as const;

const deckleUser = z.object({ id: z.uuid(), email: z.email().nullish() });

export type DeckleUser = z.input<typeof deckleUser>;

/**
 * Vouches for a Deckle user to commerce: a short-lived EdDSA JWT that commerce's
 * `deckle` authentication strategy verifies against the gateway's JWKS. Commerce
 * holds no secret that could mint one.
 */
@Injectable()
export class CommerceTokenSigner {
  constructor(private readonly keys: SigningKeys) {}

  async sign(user: DeckleUser): Promise<string> {
    const { id, email } = deckleUser.parse(user);
    const { kid, key } = await this.keys.current();
    return new SignJWT(email === null || email === undefined ? {} : { email })
      .setProtectedHeader({ alg: SIGNING_ALGORITHM, kid, typ: 'JWT' })
      .setIssuer(COMMERCE_TOKEN.issuer)
      .setAudience(COMMERCE_TOKEN.audience)
      .setSubject(id)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime(`${COMMERCE_TOKEN.lifetimeSeconds}s`)
      .sign(key);
  }
}
