import { createLocalJWKSet, decodeProtectedHeader, type JSONWebKeySet, jwtVerify } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import { createTestApp, type TestApp, testEnv } from '../../test/support/test-app.js';
import { COMMERCE_TOKEN, CommerceTokenSigner } from './commerce-token.signer.js';

const USER_ID = '6f1c2a5e-8b7d-4e3a-9c1f-2d4b6a8e0c13';

describe('identity towards commerce', () => {
  const upstreams = new FakeUpstreams();
  let gateway: TestApp;
  let jwks: JSONWebKeySet;

  beforeAll(async () => {
    await upstreams.start();
    gateway = await createTestApp({ env: testEnv(upstreams) });
    jwks = (await request(gateway.app.getHttpServer()).get('/internal/jwks.json'))
      .body as JSONWebKeySet;
  });

  afterAll(async () => {
    await gateway.close();
    await upstreams.close();
  });

  it('publishes the public half of the key created on first start', async () => {
    const response = await request(gateway.app.getHttpServer()).get('/internal/jwks.json');

    expect(response.headers['content-type']).toContain('application/jwk-set+json');
    expect(response.headers['cache-control']).toBe('public, max-age=300');
    expect(jwks.keys).toEqual([
      {
        kty: 'OKP',
        crv: 'Ed25519',
        x: expect.any(String),
        kid: expect.any(String),
        alg: 'EdDSA',
        use: 'sig',
      },
    ]);
    expect(JSON.stringify(jwks)).not.toContain('"d"');
  });

  it('signs a token commerce can verify with that set, for one user, for a minute at most', async () => {
    const token = await gateway.app
      .get(CommerceTokenSigner)
      .sign({ id: USER_ID, email: 'reader@example.com' });

    const { payload, protectedHeader } = await jwtVerify(token, createLocalJWKSet(jwks), {
      issuer: COMMERCE_TOKEN.issuer,
      audience: COMMERCE_TOKEN.audience,
      algorithms: ['EdDSA'],
    });

    expect(protectedHeader).toEqual({ alg: 'EdDSA', kid: jwks.keys[0]?.kid, typ: 'JWT' });
    expect(payload).toMatchObject({ sub: USER_ID, email: 'reader@example.com' });
    expect(payload.jti).toEqual(expect.any(String));
    expect(payload.exp! - payload.iat!).toBeLessThanOrEqual(60);
  });

  it('leaves the email out when there is none, and refuses a user id that is not a uuid', async () => {
    const signer = gateway.app.get(CommerceTokenSigner);

    const token = await signer.sign({ id: USER_ID });
    expect(decodeProtectedHeader(token).alg).toBe('EdDSA');
    const { payload } = await jwtVerify(token, createLocalJWKSet(jwks));
    expect(payload).not.toHaveProperty('email');

    await expect(signer.sign({ id: 'user-1' })).rejects.toThrow();
  });
});
