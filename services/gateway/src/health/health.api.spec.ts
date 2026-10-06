import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import { createTestApp, type TestApp, testEnv } from '../../test/support/test-app.js';

describe('GET /health', () => {
  let upstreams: FakeUpstreams | undefined;
  let gateway: TestApp | undefined;

  afterEach(async () => {
    await gateway?.close();
    await upstreams?.close();
  });

  async function start(options: { healthyDatabase: boolean; upstreamsUp: boolean }) {
    upstreams = await new FakeUpstreams().start();
    const env = testEnv(upstreams);
    if (!options.upstreamsUp) {
      // Nothing listens on port 9 (discard); every call to it is refused.
      env['COMMERCE_SHOP_API_URL'] = 'http://127.0.0.1:9/shop-api';
      env['CMS_API_URL'] = 'http://127.0.0.1:9/api';
    }
    gateway = await createTestApp({ env, healthyDatabase: options.healthyDatabase });
    return request(gateway.app.getHttpServer()).get('/health');
  }

  it('is ok when the database and both upstreams answer', async () => {
    const response = await start({ healthyDatabase: true, upstreamsUp: true });

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.body).toMatchObject({
      status: 'ok',
      details: {
        database: { status: 'up' },
        pubsub: { status: 'up' },
        commerce: { status: 'up' },
        cms: { status: 'up' },
      },
    });
  });

  it('stays healthy, but degraded, when the upstreams are down', async () => {
    const response = await start({ healthyDatabase: true, upstreamsUp: false });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'degraded',
      details: {
        database: { status: 'up' },
        commerce: { status: 'degraded' },
        cms: { status: 'degraded' },
      },
    });
  });

  it('is unhealthy without its database', async () => {
    const response = await start({ healthyDatabase: false, upstreamsUp: true });

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: 'error',
      details: { database: { status: 'down' } },
    });
  });
});
