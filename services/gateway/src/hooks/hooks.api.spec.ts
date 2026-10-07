import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import { cmsEvent, commerceEvent, deliver } from '../../test/support/hooks.js';
import { createTestApp, TEST_SECRETS, type TestApp, testEnv } from '../../test/support/test-app.js';

const commerce = { secret: TEST_SECRETS.COMMERCE_HOOK_SECRET };
const cms = { secret: TEST_SECRETS.CMS_HOOK_SECRET };

describe('webhooks', () => {
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

  beforeEach(() => {
    upstreams.reset();
  });

  it("revalidates the store's tags for a commerce change, at once, and tells subscribers", async () => {
    const event = commerceEvent({
      type: 'product',
      subject: { productId: '1', slug: 'melencolia-i' },
    });

    const response = await deliver(gateway, '/hooks/commerce', event, commerce);

    expect(response.status).toBe(204);
    expect(upstreams.requests.store).toEqual([
      expect.objectContaining({
        path: '/api/revalidate',
        headers: expect.objectContaining({
          authorization: `Bearer ${TEST_SECRETS.STORE_REVALIDATE_SECRET}`,
        }),
        body: { tags: ['artwork:melencolia-i', 'catalog'], profile: 'expire' },
      }),
    ]);
    expect(gateway.pubSub.published).toContainEqual({
      topic: 'artwork-changed:melencolia-i',
      payload: {
        slug: 'melencolia-i',
        kind: 'PRODUCT',
        action: 'UPDATED',
        occurredAt: event.occurredAt,
      },
    });
  });

  it('lets a CMS change serve stale while the store rebuilds', async () => {
    const response = await deliver(gateway, '/hooks/cms', cmsEvent(), cms);

    expect(response.status).toBe(204);
    expect(upstreams.requests.store.map((entry) => entry.body)).toEqual([
      { tags: ['story:melencolia-i', 'stories'], profile: 'max' },
    ]);
  });

  it('handles a delivery once, however many times it arrives', async () => {
    const event = commerceEvent();

    const first = await deliver(gateway, '/hooks/commerce', event, commerce);
    const again = await deliver(gateway, '/hooks/commerce', event, commerce);

    expect([first.status, again.status]).toEqual([204, 204]);
    expect(upstreams.requests.store).toHaveLength(1);
  });

  it('asks for a retry when the store cannot be revalidated, and handles the retry in full', async () => {
    const event = commerceEvent();
    upstreams.storeStatus = 500;

    const failed = await deliver(gateway, '/hooks/commerce', event, commerce);
    expect(failed.status).toBe(503);
    expect(gateway.deliveries.handled.has(event.id)).toBe(false);

    upstreams.storeStatus = 204;
    const retried = await deliver(gateway, '/hooks/commerce', event, commerce);
    expect(retried.status).toBe(204);
    expect(upstreams.requests.store).toHaveLength(2);
  });

  describe('refuses a request it cannot trust', () => {
    it('without a signature', async () => {
      const response = await request(gateway.app.getHttpServer())
        .post('/hooks/commerce')
        .send(commerceEvent());
      expect(response.status).toBe(401);
    });

    it("signed with another sender's secret", async () => {
      const response = await deliver(gateway, '/hooks/commerce', commerceEvent(), cms);
      expect(response.status).toBe(401);
    });

    it('signed more than five minutes ago', async () => {
      const signedAt = Date.now() / 1000 - 301;
      const response = await deliver(gateway, '/hooks/commerce', commerceEvent(), {
        ...commerce,
        signedAt,
      });
      expect(response.status).toBe(401);
    });

    it('whose body changed after it was signed', async () => {
      const event = commerceEvent();
      const signedBody = JSON.stringify({
        ...event,
        subject: { ...event.subject, slug: 'the-rhinoceros' },
      });
      const response = await deliver(gateway, '/hooks/commerce', event, {
        ...commerce,
        signedBody,
      });
      expect(response.status).toBe(401);
    });

    it('before reading its body', async () => {
      const response = await request(gateway.app.getHttpServer())
        .post('/hooks/commerce')
        .set('deckle-signature', 't=1,v1=00')
        .send({ not: 'an event' });
      expect(response.status).toBe(401);
      expect(upstreams.requests.store).toHaveLength(0);
    });
  });

  it.each([
    ['no id', { id: undefined }],
    ['an id that is not a uuid', { id: 'delivery-1' }],
    ['another source', { source: 'cms' }],
    ['a type commerce does not send', { type: 'customer' }],
    ['a subject without a slug', { subject: { productId: 1 } }],
  ])('answers 400 to a signed body with %s', async (_case, overrides) => {
    const response = await deliver(gateway, '/hooks/commerce', commerceEvent(overrides), commerce);
    expect(response.status).toBe(400);
    expect(upstreams.requests.store).toHaveLength(0);
  });
});

describe('webhooks before the store exists', () => {
  const upstreams = new FakeUpstreams();
  let gateway: TestApp;

  beforeAll(async () => {
    await upstreams.start();
    gateway = await createTestApp({ env: { ...testEnv(upstreams), STORE_REVALIDATE_URL: '' } });
  });

  afterAll(async () => {
    await gateway.close();
    await upstreams.close();
  });

  it('skips revalidation but still tells subscribers', async () => {
    const response = await deliver(gateway, '/hooks/commerce', commerceEvent(), commerce);

    expect(response.status).toBe(204);
    expect(upstreams.requests.store).toHaveLength(0);
    expect(gateway.pubSub.published).toHaveLength(1);
  });
});
