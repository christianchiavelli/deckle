import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';

/** Fixed by the contract between the gateway and commerce (BRIEF, "Gateway identity"). */
export const GATEWAY_ISSUER = 'deckle-gateway';
export const COMMERCE_AUDIENCE = 'deckle-commerce';
/** The gateway signs tokens that expire at most this many seconds after they are issued. */
export const MAX_TOKEN_LIFETIME_S = 60;

const claimsSchema = z.object({
  sub: z.uuid(),
  email: z.email().optional(),
  exp: z.number().int(),
});

export interface GatewayIdentity {
  /** The Deckle user id: stable, and what the Vendure user is found by. */
  readonly userId: string;
  readonly email: string | null;
}

export type TokenCheck = { ok: true; identity: GatewayIdentity } | { ok: false; reason: string };

/** The gateway's keys could not be fetched: the token may be fine, it just cannot be checked. */
export class GatewayKeysUnavailableError extends Error {
  override readonly name = 'GatewayKeysUnavailableError';
}

export interface GatewayTokenVerifierOptions {
  readonly jwksUrl: URL;
  /** Seconds of clock skew allowed between the gateway and commerce. */
  readonly clockToleranceS?: number;
  /** Replaces the remote key set; for tests. */
  readonly keys?: JWTVerifyGetKey;
}

/**
 * Checks the short-lived EdDSA token the gateway signs for each customer it vouches
 * for, against the public keys it publishes. Commerce holds no secret that could mint
 * such a token, so a leak of its configuration cannot log anyone in.
 */
export class GatewayTokenVerifier {
  private readonly keys: JWTVerifyGetKey;
  private readonly clockToleranceS: number;

  constructor(options: GatewayTokenVerifierOptions) {
    this.clockToleranceS = options.clockToleranceS ?? 5;
    const remote =
      options.keys ??
      createRemoteJWKSet(options.jwksUrl, {
        timeoutDuration: 2_000,
        // A token signed with a key not seen yet makes jose fetch the set again, at most
        // this often: a rotation is picked up without a restart, a flood of bad kids is not.
        cooldownDuration: 30_000,
        cacheMaxAge: 10 * 60_000,
      });
    this.keys = async (header, token) => {
      let key: Awaited<ReturnType<JWTVerifyGetKey>>;
      try {
        key = await remote(header, token);
      } catch (error) {
        if (
          error instanceof errors.JWKSNoMatchingKey ||
          error instanceof errors.JWKSMultipleMatchingKeys
        ) {
          throw error;
        }
        // Anything else is about fetching the set (refused, timed out, not 200, not a
        // key set), which says nothing about the token itself.
        throw new GatewayKeysUnavailableError("The gateway's keys could not be loaded", {
          cause: error,
        });
      }
      // EdDSA also names Ed448; the contract is Ed25519 only.
      if ('algorithm' in key && key.algorithm.name !== 'Ed25519') {
        throw new errors.JOSEAlgNotAllowed(`Expected an Ed25519 key, got ${key.algorithm.name}`);
      }
      return key;
    };
  }

  async verify(token: string, nowMs: number = Date.now()): Promise<TokenCheck> {
    let payload: unknown;
    try {
      ({ payload } = await jwtVerify(token, this.keys, {
        issuer: GATEWAY_ISSUER,
        audience: COMMERCE_AUDIENCE,
        // RFC 9864 names the Ed25519 signature "Ed25519"; older signers say "EdDSA".
        algorithms: ['EdDSA', 'Ed25519'],
        requiredClaims: ['sub', 'exp'],
        clockTolerance: this.clockToleranceS,
        currentDate: new Date(nowMs),
      }));
    } catch (error) {
      return { ok: false, reason: rejectionReason(error) };
    }

    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) {
      return { ok: false, reason: 'The token carries a malformed sub or email claim' };
    }
    const nowS = Math.floor(nowMs / 1000);
    if (claims.data.exp > nowS + MAX_TOKEN_LIFETIME_S + this.clockToleranceS) {
      return { ok: false, reason: `The token lives longer than ${MAX_TOKEN_LIFETIME_S} s` };
    }
    return { ok: true, identity: { userId: claims.data.sub, email: claims.data.email ?? null } };
  }
}

function rejectionReason(error: unknown): string {
  if (error instanceof GatewayKeysUnavailableError) {
    throw error;
  }
  if (error instanceof errors.JWTExpired) {
    return 'The token has expired';
  }
  if (error instanceof errors.JWTClaimValidationFailed) {
    return `The token's ${error.claim} claim is not accepted`;
  }
  if (error instanceof errors.JWSSignatureVerificationFailed) {
    return "The token's signature does not verify";
  }
  if (
    error instanceof errors.JWKSNoMatchingKey ||
    error instanceof errors.JWKSMultipleMatchingKeys
  ) {
    return 'No published gateway key matches the token';
  }
  if (error instanceof errors.JOSEAlgNotAllowed || error instanceof errors.JOSENotSupported) {
    return "The token's algorithm is not accepted";
  }
  if (error instanceof errors.JOSEError) {
    return 'The token is malformed';
  }
  throw error;
}
