import { describe, expect, it } from 'vitest';
import { isApiKeyWrite } from './api-key-guard';

const apiKey = { authorization: 'users API-Key 0a6f8e9c-api-key' };

describe('isApiKeyWrite', () => {
  it.each(['GET', 'HEAD', 'OPTIONS', 'get'])('lets an API key %s', (method) => {
    expect(isApiKeyWrite(method, new Headers(apiKey))).toBe(false);
  });

  it.each(['POST', 'PATCH', 'PUT', 'DELETE'])('stops an API key from %s', (method) => {
    expect(isApiKeyWrite(method, new Headers(apiKey))).toBe(true);
  });

  it("lets an API key read through Payload's POST-as-GET override", () => {
    const headers = new Headers({ ...apiKey, 'x-payload-http-method-override': 'GET' });
    expect(isApiKeyWrite('POST', headers)).toBe(false);
    const legacy = new Headers({ ...apiKey, 'x-http-method-override': 'GET' });
    expect(isApiKeyWrite('POST', legacy)).toBe(false);
  });

  it('does not let the override turn another method into a read', () => {
    const headers = new Headers({ ...apiKey, 'x-payload-http-method-override': 'GET' });
    expect(isApiKeyWrite('DELETE', headers)).toBe(true);
  });

  it('leaves sessions and anonymous requests to access control', () => {
    expect(isApiKeyWrite('POST', new Headers({ authorization: 'JWT eyJhbGciOi' }))).toBe(false);
    expect(isApiKeyWrite('POST', new Headers())).toBe(false);
    expect(isApiKeyWrite('POST', new Headers({ authorization: 'users API-Key ' }))).toBe(false);
  });
});
