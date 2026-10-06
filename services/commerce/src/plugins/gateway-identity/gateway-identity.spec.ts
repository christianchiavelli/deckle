import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  ExternalAuthenticationService,
  RequestContext,
  UnverifiedExternalEmailError,
  User,
  type Injector,
} from '@vendure/core';
import { print } from 'graphql';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey, type JWK } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  DeckleAuthenticationStrategy,
  placeholderEmail,
} from './deckle-authentication-strategy.js';
import {
  COMMERCE_AUDIENCE,
  GATEWAY_ISSUER,
  GatewayKeysUnavailableError,
  GatewayTokenVerifier,
} from './gateway-token.js';

const userId = '0b7c4a52-6f0e-4d38-9a51-2d8f0c7f1e3a';
const now = Date.UTC(2026, 9, 5, 12, 0, 0);
const nowS = Math.floor(now / 1000);

interface SigningKey {
  kid: string;
  privateKey: CryptoKey;
  jwk: JWK;
}

async function signingKey(kid: string): Promise<SigningKey> {
  const { privateKey, publicKey } = await generateKeyPair('Ed25519');
  return { kid, privateKey, jwk: { ...(await exportJWK(publicKey)), kid, use: 'sig' } };
}

interface Claims {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  exp?: number;
}

function sign(key: SigningKey, claims: Claims = {}, alg = 'EdDSA'): Promise<string> {
  const {
    iss = GATEWAY_ISSUER,
    aud = COMMERCE_AUDIENCE,
    sub = userId,
    exp = nowS + 30,
    email,
  } = claims;
  return new SignJWT(email === undefined ? {} : { email })
    .setProtectedHeader({ alg, kid: key.kid })
    .setIssuer(iss)
    .setAudience(aud)
    .setSubject(sub)
    .setIssuedAt(nowS)
    .setExpirationTime(exp)
    .sign(key.privateKey);
}

describe('GatewayTokenVerifier', () => {
  let published: JWK[] = [];
  let up = true;
  const jwks = createServer((_request, response) => {
    if (!up) {
      response.statusCode = 503;
      response.end();
      return;
    }
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ keys: published }));
  });
  let jwksUrl: URL;
  let current: SigningKey;
  let stranger: SigningKey;

  beforeAll(async () => {
    await new Promise<void>((resolve) => jwks.listen(0, '127.0.0.1', resolve));
    jwksUrl = new URL(
      `http://127.0.0.1:${(jwks.address() as AddressInfo).port}/internal/jwks.json`,
    );
    current = await signingKey('gateway-2026-10');
    stranger = await signingKey('gateway-2026-10');
    published = [current.jwk];
  });

  afterAll(async () => {
    await new Promise((resolve) => jwks.close(resolve));
  });

  const verifier = () => new GatewayTokenVerifier({ jwksUrl });

  it("accepts the gateway's token and reads who it vouches for", async () => {
    const check = await verifier().verify(await sign(current, { email: 'ada@example.com' }), now);
    expect(check).toEqual({ ok: true, identity: { userId, email: 'ada@example.com' } });
  });

  it('accepts the fully specified Ed25519 algorithm name too, and a token without email', async () => {
    const check = await verifier().verify(await sign(current, {}, 'Ed25519'), now);
    expect(check).toEqual({ ok: true, identity: { userId, email: null } });
  });

  it('allows a few seconds of clock skew, and no more', async () => {
    const token = await sign(current, { exp: nowS - 3 });
    expect((await verifier().verify(token, now)).ok).toBe(true);
    expect(await verifier().verify(await sign(current, { exp: nowS - 10 }), now)).toEqual({
      ok: false,
      reason: 'The token has expired',
    });
  });

  it.each([
    ['another issuer', { iss: 'someone-else' }, "The token's iss claim is not accepted"],
    ['another audience', { aud: 'deckle-cms' }, "The token's aud claim is not accepted"],
    ['a lifetime over 60 s', { exp: nowS + 600 }, 'The token lives longer than 60 s'],
    [
      'a subject that is not a Deckle user id',
      { sub: 'admin' },
      'The token carries a malformed sub or email claim',
    ],
    [
      'a malformed email',
      { email: 'not-an-address' },
      'The token carries a malformed sub or email claim',
    ],
  ])('refuses a token with %s', async (_case, claims: Claims, reason) => {
    expect(await verifier().verify(await sign(current, claims), now)).toEqual({
      ok: false,
      reason,
    });
  });

  it('refuses a token signed by a key it does not publish', async () => {
    const forged = await sign(stranger);
    expect(await verifier().verify(forged, now)).toEqual({
      ok: false,
      reason: "The token's signature does not verify",
    });
    const unknown = await sign({ ...stranger, kid: 'gateway-1999-01' });
    expect(await verifier().verify(unknown, now)).toEqual({
      ok: false,
      reason: 'No published gateway key matches the token',
    });
  });

  it('refuses other algorithms, a shared secret included', async () => {
    const hmac = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', kid: current.kid })
      .setIssuer(GATEWAY_ISSUER)
      .setAudience(COMMERCE_AUDIENCE)
      .setSubject(userId)
      .setExpirationTime(nowS + 30)
      .sign(new TextEncoder().encode('a-secret-anyone-could-guess-0123456789'));
    expect(await verifier().verify(hmac, now)).toEqual({
      ok: false,
      reason: "The token's algorithm is not accepted",
    });
  });

  it('refuses something that is not a token', async () => {
    expect(await verifier().verify('not.a.token', now)).toEqual({
      ok: false,
      reason: 'The token is malformed',
    });
  });

  it('fails loudly, rather than refusing the customer, when the keys cannot be loaded', async () => {
    up = false;
    try {
      await expect(verifier().verify(await sign(current), now)).rejects.toBeInstanceOf(
        GatewayKeysUnavailableError,
      );
    } finally {
      up = true;
    }
  });
});

describe('DeckleAuthenticationStrategy', () => {
  const ctx = RequestContext.empty();
  const knownUser = new User({ id: 9, identifier: placeholderEmail(userId) });

  function strategyWith(check: Awaited<ReturnType<GatewayTokenVerifier['verify']>>) {
    const verifier = {
      verify: vi.fn().mockResolvedValue(check),
    } as unknown as GatewayTokenVerifier;
    const external = {
      findCustomerUser: vi.fn().mockResolvedValue(undefined),
      createCustomerAndUser: vi.fn().mockResolvedValue(knownUser),
    };
    const strategy = new DeckleAuthenticationStrategy(verifier);
    strategy.init({
      get: (token: unknown) => {
        expect(token).toBe(ExternalAuthenticationService);
        return external;
      },
    } as unknown as Injector);
    return { strategy, external };
  }

  const vouched = { ok: true, identity: { userId, email: null } } as const;

  it("adds `deckle: { token }` to the Shop API's authenticate input", () => {
    const strategy = new DeckleAuthenticationStrategy({} as GatewayTokenVerifier);
    expect(strategy.name).toBe('deckle');
    expect(print(strategy.defineInputType())).toMatch(
      /input DeckleAuthInput \{[^}]*token: String!/s,
    );
  });

  it('signs in the customer it already knows for that Deckle user', async () => {
    const { strategy, external } = strategyWith(vouched);
    external.findCustomerUser.mockResolvedValue(knownUser);
    await expect(strategy.authenticate(ctx, { token: 'jwt' })).resolves.toBe(knownUser);
    expect(external.findCustomerUser).toHaveBeenCalledWith(ctx, 'deckle', userId);
    expect(external.createCustomerAndUser).not.toHaveBeenCalled();
  });

  it('creates the customer on first sight, unverified, with a placeholder address when there is no email', async () => {
    const { strategy, external } = strategyWith(vouched);
    await expect(strategy.authenticate(ctx, { token: 'jwt' })).resolves.toBe(knownUser);
    expect(external.createCustomerAndUser).toHaveBeenCalledWith(ctx, {
      strategy: 'deckle',
      externalIdentifier: userId,
      emailAddress: `${userId}@users.deckle.invalid`,
      firstName: '',
      lastName: '',
      verified: false,
    });
  });

  it('never takes over an account that already uses the email', async () => {
    const { strategy, external } = strategyWith({
      ok: true,
      identity: { userId, email: 'ada@example.com' },
    });
    external.createCustomerAndUser.mockRejectedValue(new UnverifiedExternalEmailError());
    await expect(strategy.authenticate(ctx, { token: 'jwt' })).resolves.toBe(
      'Another account already uses this email address',
    );
  });

  it('passes any other failure on', async () => {
    const { strategy, external } = strategyWith(vouched);
    external.createCustomerAndUser.mockRejectedValue(new Error('connection lost'));
    await expect(strategy.authenticate(ctx, { token: 'jwt' })).rejects.toThrow('connection lost');
  });

  it("answers with the verifier's reason when the token is refused", async () => {
    const { strategy, external } = strategyWith({ ok: false, reason: 'The token has expired' });
    await expect(strategy.authenticate(ctx, { token: 'jwt' })).resolves.toBe(
      'The token has expired',
    );
    expect(external.findCustomerUser).not.toHaveBeenCalled();
  });

  it('refuses to run before Vendure has initialised it', async () => {
    const strategy = new DeckleAuthenticationStrategy({} as GatewayTokenVerifier);
    await expect(strategy.authenticate(ctx, { token: 'jwt' })).rejects.toThrow(
      'before Vendure initialised it',
    );
  });
});
