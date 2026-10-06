import { RequestContext } from '@vendure/core';
import { describe, expect, it } from 'vitest';
import {
  adminApiKeyStrategy,
  ProvisionedApiKeyStrategy,
  Sha256ApiKeyHashing,
  splitApiKey,
} from './api-keys.js';

const ctx = RequestContext.empty();
const gatewayKey = 'deckle-gateway:local-only-gateway-api-key-0123456789abcdef';

describe('Sha256ApiKeyHashing', () => {
  const hashing = new Sha256ApiKeyHashing();

  it('hashes with SHA-256, labelled so a later change of scheme can tell old hashes apart', async () => {
    await expect(hashing.hash('secret')).resolves.toBe(
      'sha256:2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b',
    );
  });

  it('checks a secret against its hash, and refuses anything else', async () => {
    const hash = await hashing.hash('local-only-gateway-api-key-0123456789abcdef');
    await expect(hashing.check('local-only-gateway-api-key-0123456789abcdef', hash)).resolves.toBe(
      true,
    );
    await expect(hashing.check('local-only-gateway-api-key-0123456789abcdeg', hash)).resolves.toBe(
      false,
    );
    await expect(
      hashing.check('local-only-gateway-api-key-0123456789abcdef', 'sha256:'),
    ).resolves.toBe(false);
  });
});

describe('splitApiKey', () => {
  it('splits a key at its first colon, as Vendure parses it', () => {
    expect(splitApiKey(gatewayKey)).toEqual({
      lookupId: 'deckle-gateway',
      secret: 'local-only-gateway-api-key-0123456789abcdef',
    });
    expect(adminApiKeyStrategy().parse(gatewayKey)).toMatchObject({
      lookupId: 'deckle-gateway',
      apiKey: 'local-only-gateway-api-key-0123456789abcdef',
    });
  });

  it.each([':secret', 'lookup:', 'no-separator'])('refuses %s', (key) => {
    expect(() => splitApiKey(key)).toThrow(RangeError);
  });
});

describe('API key strategies', () => {
  it('generate random keys for keys made in the dashboard', async () => {
    const strategy = adminApiKeyStrategy();
    const [first, second] = await Promise.all([
      strategy.generateSecret(ctx),
      strategy.generateSecret(ctx),
    ]);
    expect(first).not.toBe(second);
    expect(strategy.hashingStrategy).toBeInstanceOf(Sha256ApiKeyHashing);
    expect(strategy.lastUsedAtUpdateInterval).toBe('5m');
  });

  it("hand the seed the gateway's key from the environment", async () => {
    const strategy = new ProvisionedApiKeyStrategy(splitApiKey(gatewayKey));
    await expect(strategy.generateLookupId()).resolves.toBe('deckle-gateway');
    await expect(strategy.generateSecret()).resolves.toBe(
      'local-only-gateway-api-key-0123456789abcdef',
    );
    expect(
      strategy.constructApiKey('deckle-gateway', 'local-only-gateway-api-key-0123456789abcdef'),
    ).toBe(gatewayKey);
    expect(strategy.hashingStrategy).toBeInstanceOf(Sha256ApiKeyHashing);
  });
});
