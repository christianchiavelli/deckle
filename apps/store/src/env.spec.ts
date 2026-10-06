import { describe, expect, it } from 'vitest';
import { InvalidEnvironmentError, parseStoreEnv } from './env';

const valid = {
  GATEWAY_URL: 'http://gateway:4000/graphql',
  STORE_REVALIDATE_SECRET: 'a-local-secret-that-is-long-enough-1234',
};

describe('parseStoreEnv', () => {
  it('reads a complete environment', () => {
    expect(parseStoreEnv(valid)).toEqual(valid);
  });

  it('names every missing or bad variable, without echoing a value', () => {
    const attempt = () =>
      parseStoreEnv({ GATEWAY_URL: 'ftp://gateway', STORE_REVALIDATE_SECRET: 'short' });
    expect(attempt).toThrow(InvalidEnvironmentError);
    try {
      attempt();
    } catch (error) {
      expect((error as InvalidEnvironmentError).problems).toEqual([
        'GATEWAY_URL must be an http(s) URL',
        'STORE_REVALIDATE_SECRET must be at least 32 characters',
      ]);
      expect((error as Error).message).not.toContain('short');
    }
  });

  it('says a variable is not set rather than that it is wrong', () => {
    expect(() => parseStoreEnv({})).toThrow(
      /GATEWAY_URL is not set\n {2}- STORE_REVALIDATE_SECRET is not set/,
    );
  });
});
