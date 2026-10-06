import { randomUUID } from 'node:crypto';
import type { Client } from 'graphql-ws';
import { createLocalJWKSet, type JSONWebKeySet, jwtVerify } from 'jose';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FakeUpstreams } from '../test/support/fake-upstreams.js';
import { commerceEvent, deliver } from '../test/support/hooks.js';
import { startPostgres } from '../test/support/postgres.js';
import { subscriptionClient } from '../test/support/subscriptions.js';
import { createDatabaseApp, TEST_SECRETS, testEnv } from '../test/support/test-app.js';
import { COMMERCE_TOKEN, CommerceTokenSigner } from './identity/commerce-token.signer.js';
import { PubSub } from './pubsub/pubsub.js';

const ARTWORK_CHANGED = /* GraphQL */ `
  subscription Changes($slug: String!) {
    artworkChanged(slug: $slug) {
      slug
      kind
      occurredAt
      artwork {
        title
        priceFrom {
          amount
        }
      }
    }
  }
`;

async function jwks(gatewayUrl: string): Promise<JSONWebKeySet> {
  const response = await fetch(`${gatewayUrl}/internal/jwks.json`);
  expect(response.status).toBe(200);
  return (await response.json()) as JSONWebKeySet;
}

/** Two replicas, or a replica and its restart, on one Postgres 18: what compose runs. */
describe('gateway replicas sharing Postgres 18', () => {
  const upstreams = new FakeUpstreams();
  let client: Client | undefined;

  beforeAll(async () => {
    await upstreams.start();
  });

  afterEach(async () => {
    await client?.dispose();
    client = undefined;
    upstreams.reset();
  });

  afterAll(async () => {
    await upstreams.close();
  });

  it('carries a change received by one replica to subscribers on the other', async () => {
    await using postgres = await startPostgres();
    const env = { ...testEnv(upstreams), DATABASE_URL: postgres.getConnectionUri() };
    await using a = await createDatabaseApp({ env });
    await using b = await createDatabaseApp({ env });
    const health = await fetch(`${b.url}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({
      status: 'ok',
      details: { database: { status: 'up' }, pubsub: { status: 'up' } },
    });
    const subscribed = vi.spyOn(b.app.get(PubSub), 'subscribe');
    client = subscriptionClient(b.url);
    const changes = client.iterate({ query: ARTWORK_CHANGED, variables: { slug: 'melencolia-i' } });
    const first = changes.next();
    await vi.waitFor(() => {
      expect(subscribed).toHaveBeenCalledOnce();
    });

    const hook = await deliver(a, '/hooks/commerce', commerceEvent({ type: 'stock' }), {
      secret: TEST_SECRETS.COMMERCE_HOOK_SECRET,
    });

    expect(hook.status).toBe(204);
    expect((await first).value).toEqual({
      data: {
        artworkChanged: {
          slug: 'melencolia-i',
          kind: 'STOCK',
          occurredAt: '2026-10-05T12:00:00.000Z',
          artwork: { title: 'Melencolia I', priceFrom: { amount: 5500 } },
        },
      },
    });
    await changes.return?.();
  });

  it('does the work for a delivery once, whichever replicas it reaches', async () => {
    await using postgres = await startPostgres();
    const env = { ...testEnv(upstreams), DATABASE_URL: postgres.getConnectionUri() };
    await using a = await createDatabaseApp({ env });
    await using b = await createDatabaseApp({ env });
    const event = commerceEvent({ type: 'price' });
    const secret = TEST_SECRETS.COMMERCE_HOOK_SECRET;

    const answers = await Promise.all([
      deliver(a, '/hooks/commerce', event, { secret }),
      deliver(b, '/hooks/commerce', event, { secret }),
    ]);
    const late = await deliver(b, '/hooks/commerce', event, { secret });

    expect([...answers, late].map((answer) => answer.status)).toEqual([204, 204, 204]);
    expect(upstreams.requests.store).toHaveLength(1);
  });

  it('serves one key set from every replica, kept across restarts', async () => {
    await using postgres = await startPostgres();
    const env = { ...testEnv(upstreams), DATABASE_URL: postgres.getConnectionUri() };
    await using a = await createDatabaseApp({ env });
    await using b = await createDatabaseApp({ env });
    const published = await jwks(a.url);
    const user = randomUUID();

    const token = await a.app.get(CommerceTokenSigner).sign({ id: user });

    expect(published.keys).toHaveLength(1);
    expect(await jwks(b.url)).toEqual(published);
    const verified = await jwtVerify(token, createLocalJWKSet(await jwks(b.url)), {
      issuer: COMMERCE_TOKEN.issuer,
      audience: COMMERCE_TOKEN.audience,
      algorithms: ['EdDSA'],
    });
    expect(verified.payload.sub).toBe(user);
    expect(verified.protectedHeader.kid).toBe(published.keys[0]?.kid);

    await a.close();
    await b.close();
    await using restarted = await createDatabaseApp({ env });

    expect(await jwks(restarted.url)).toEqual(published);
  });
});
