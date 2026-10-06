import { describe, expect, it } from 'vitest';
import { isAuthorized, parseRevalidation, revalidateProfile } from './revalidation';

const SECRET = 'local-only-revalidate-secret-not-for-production';

describe('isAuthorized', () => {
  it('accepts the shared secret as a bearer token', () => {
    expect(isAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it('refuses anything else', () => {
    expect(isAuthorized(null, SECRET)).toBe(false);
    expect(isAuthorized(SECRET, SECRET)).toBe(false);
    expect(isAuthorized(`Basic ${SECRET}`, SECRET)).toBe(false);
    expect(isAuthorized(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isAuthorized(`Bearer ${SECRET.replace('local', 'LOCAL')}`, SECRET)).toBe(false);
  });
});

describe('parseRevalidation', () => {
  it('reads the tags and the profile the gateway sends', () => {
    expect(
      parseRevalidation({ tags: ['price:melencolia-i', 'catalog'], profile: 'expire' }),
    ).toEqual({ tags: ['price:melencolia-i', 'catalog'], profile: 'expire' });
    expect(parseRevalidation({ tags: ['story:melencolia-i'], profile: 'max' })).toEqual({
      tags: ['story:melencolia-i'],
      profile: 'max',
    });
  });

  it('refuses a tag outside the vocabulary, an unknown profile or an empty list', () => {
    expect(parseRevalidation({ tags: ['user:42'], profile: 'expire' })).toBeNull();
    expect(parseRevalidation({ tags: ['catalog'], profile: 'soon' })).toBeNull();
    expect(parseRevalidation({ tags: [], profile: 'max' })).toBeNull();
    expect(parseRevalidation(undefined)).toBeNull();
  });
});

describe('revalidateProfile', () => {
  it('drops commerce data at once, and lets editorial text be served stale', () => {
    expect(revalidateProfile('expire')).toEqual({ expire: 0 });
    expect(revalidateProfile('max')).toBe('max');
  });
});
