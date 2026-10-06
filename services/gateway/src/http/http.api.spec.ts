import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import {
  createTestApp,
  PUBLIC_ORIGIN,
  type TestApp,
  testEnv,
} from '../../test/support/test-app.js';
import { JSON_BODY_LIMIT } from './configure-http.js';

describe('the HTTP pipeline', () => {
  const upstreams = new FakeUpstreams();
  let gateway: TestApp;

  beforeAll(async () => {
    await upstreams.start();
    gateway = await createTestApp({ env: testEnv(upstreams) });
  });

  afterAll(async () => {
    await gateway.close();
    await upstreams.close();
  });

  const http = () => request(gateway.app.getHttpServer());
  const typename = { query: '{ __typename }' };

  it('sets the security headers on every response, a 404 included', async () => {
    for (const response of [
      await http().post('/graphql').send(typename),
      await http().get('/nowhere'),
    ]) {
      expect(response.headers).toMatchObject({
        'content-security-policy': expect.stringContaining("default-src 'self'"),
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-resource-policy': 'same-origin',
        'referrer-policy': 'no-referrer',
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
      });
      expect(response.headers['x-powered-by']).toBeUndefined();
    }
  });

  it('turns away a cross-site browser request that would change state', async () => {
    const response = await http()
      .post('/graphql')
      .set({ origin: 'https://elsewhere.example', 'sec-fetch-site': 'cross-site' })
      .send(typename);

    expect(response.status).toBe(403);
  });

  it("lets through the store's own pages and servers, which send no browser headers", async () => {
    const sameOrigin = await http()
      .post('/graphql')
      .set({ origin: PUBLIC_ORIGIN, 'sec-fetch-site': 'same-origin' })
      .send(typename);
    const server = await http().post('/graphql').send(typename);

    expect(sameOrigin.status).toBe(200);
    expect(server.status).toBe(200);
  });

  it('keeps a request id from the proxy, and replaces one that is not a plain token', async () => {
    const kept = await http().get('/health').set('x-request-id', 'caddy-7f3a9c21');
    const replaced = await http().get('/health').set('x-request-id', 'not ok <script>');

    expect(kept.headers['x-request-id']).toBe('caddy-7f3a9c21');
    expect(replaced.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it(`refuses a body over ${JSON_BODY_LIMIT}`, async () => {
    const response = await http()
      .post('/graphql')
      .send({ query: '{ __typename }', variables: { padding: 'x'.repeat(110 * 1024) } });

    expect(response.status).toBe(413);
  });
});
