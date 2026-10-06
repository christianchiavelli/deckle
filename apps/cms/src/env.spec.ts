import { describe, expect, it } from 'vitest';
import {
  configEnv,
  InvalidEnvironmentError,
  parseEnv,
  seedEnvSchema,
  serverEnvSchema,
} from './env';

const valid = {
  DATABASE_URL: 'postgres://cms:cms@postgres:5432/cms',
  PORT: '3000',
  PAYLOAD_SECRET: 'p'.repeat(32),
  GATEWAY_HOOK_URL: 'http://gateway:4000/hooks/cms',
  HOOK_SECRET: 'h'.repeat(32),
  STORE_PREVIEW_URL: 'http://localhost:8080/api/preview',
  PREVIEW_SECRET: 's'.repeat(32),
};

const problemsOf = (source: Record<string, string | undefined>) => {
  try {
    parseEnv(serverEnvSchema, source);
  } catch (error) {
    if (error instanceof InvalidEnvironmentError) {
      return error.problems;
    }
    throw error;
  }
  return [];
};

describe('the server environment', () => {
  it('parses the contract, with the port as a number', () => {
    expect(parseEnv(serverEnvSchema, valid)).toEqual({ ...valid, PORT: 3000 });
  });

  it('defaults the port, and nothing else', () => {
    expect(parseEnv(serverEnvSchema, { ...valid, PORT: undefined }).PORT).toBe(3000);
  });

  it('names every missing variable', () => {
    expect(problemsOf({})).toEqual([
      'DATABASE_URL is not set',
      'PAYLOAD_SECRET is not set',
      'GATEWAY_HOOK_URL is not set',
      'HOOK_SECRET is not set',
      'STORE_PREVIEW_URL is not set',
      'PREVIEW_SECRET is not set',
    ]);
  });

  it('refuses short secrets, wrong schemes and bad ports without echoing them', () => {
    const problems = problemsOf({
      ...valid,
      HOOK_SECRET: 'short-and-guessable',
      DATABASE_URL: 'mysql://cms@db/cms',
      STORE_PREVIEW_URL: 'ftp://store/preview',
      PORT: 'eighty',
    });
    expect(problems).toEqual([
      'DATABASE_URL must be a postgres:// URL',
      'PORT must be a port number',
      'HOOK_SECRET must be at least 32 characters',
      'STORE_PREVIEW_URL must be an http(s) URL',
    ]);
    expect(problems.join()).not.toContain('short-and-guessable');
  });

  it('reports the problems in its message', () => {
    expect(() => parseEnv(serverEnvSchema, {})).toThrow(
      /^Invalid environment:\n {2}- DATABASE_URL is not set\n/,
    );
  });
});

describe('the seed environment', () => {
  it('needs the admin and the gateway key', () => {
    const seed = {
      ADMIN_EMAIL: 'admin@deckle.local',
      ADMIN_PASSWORD: 'long-enough-password',
      GATEWAY_API_KEY: 'k'.repeat(32),
    };
    expect(parseEnv(seedEnvSchema, seed)).toEqual({ ...seed, PORT: 3000 });
    expect(() => parseEnv(seedEnvSchema, { ...seed, ADMIN_EMAIL: 'admin' })).toThrow(
      /ADMIN_EMAIL must be an email address/,
    );
    expect(() => parseEnv(seedEnvSchema, { ...seed, ADMIN_PASSWORD: 'short' })).toThrow(
      /ADMIN_PASSWORD must be at least 12 characters/,
    );
  });
});

describe('configEnv', () => {
  it('checks the environment at run time', () => {
    expect(() => configEnv({})).toThrow(InvalidEnvironmentError);
    expect(configEnv(valid).PORT).toBe(3000);
  });

  it('lets `next build` evaluate the config without runtime secrets', () => {
    const env = configEnv({ NEXT_PHASE: 'phase-production-build' });
    expect(env.PAYLOAD_SECRET).toBe('');
    expect(env.PORT).toBe(3000);
    expect(configEnv({ ...valid, NEXT_PHASE: 'phase-production-build' })).toEqual({
      ...valid,
      PORT: 3000,
    });
  });
});
