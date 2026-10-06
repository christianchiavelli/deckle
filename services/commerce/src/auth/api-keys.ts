import { createHash, timingSafeEqual } from 'node:crypto';
import { RandomBytesApiKeyStrategy, type PasswordHashingStrategy } from '@vendure/core';

/**
 * SHA-256 for API keys. Vendure's default is bcrypt, built for passwords people
 * choose; an API key's secret is 32 random characters at least, which no slow hash
 * makes safer, and Vendure checks it on every request the gateway sends.
 */
export class Sha256ApiKeyHashing implements PasswordHashingStrategy {
  hash(plaintext: string): Promise<string> {
    return Promise.resolve(`sha256:${createHash('sha256').update(plaintext).digest('hex')}`);
  }

  async check(plaintext: string, hash: string): Promise<boolean> {
    const expected = Buffer.from(await this.hash(plaintext));
    const actual = Buffer.from(hash);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}

const hashingStrategy = new Sha256ApiKeyHashing();

// Without this, every request made with a key writes `lastUsedAt`; five minutes is
// precise enough to find keys nobody uses.
const lastUsedAtUpdateInterval = '5m';

/** The Admin API's key strategy: random keys as in Vendure's default, hashed with SHA-256. */
export function adminApiKeyStrategy(): RandomBytesApiKeyStrategy {
  return new RandomBytesApiKeyStrategy({ hashingStrategy, lastUsedAtUpdateInterval });
}

export interface ApiKeyParts {
  readonly lookupId: string;
  readonly secret: string;
}

/** Splits `<lookupId>:<secret>`, the format `apiKeySchema` in `env.ts` has already checked. */
export function splitApiKey(apiKey: string): ApiKeyParts {
  const separator = apiKey.indexOf(':');
  if (separator <= 0 || separator === apiKey.length - 1) {
    throw new RangeError('An API key reads "<lookup id>:<secret>"');
  }
  return { lookupId: apiKey.slice(0, separator), secret: apiKey.slice(separator + 1) };
}

/**
 * Issues one known key instead of random ones. Vendure 3.6+ only creates API keys
 * through its strategy, so the seed bootstraps with this one in place to create or
 * rotate the gateway's key with the value from `GATEWAY_API_KEY`. Parsing and
 * hashing are the server's own, so the server accepts what it stored.
 */
export class ProvisionedApiKeyStrategy extends RandomBytesApiKeyStrategy {
  constructor(private readonly key: ApiKeyParts) {
    super({ hashingStrategy, lastUsedAtUpdateInterval });
  }

  override generateLookupId(): Promise<string> {
    return Promise.resolve(this.key.lookupId);
  }

  override generateSecret(): Promise<string> {
    return Promise.resolve(this.key.secret);
  }
}
