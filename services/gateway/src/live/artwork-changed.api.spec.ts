import type { Client } from 'graphql-ws';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import { commerceEvent, deliver } from '../../test/support/hooks.js';
import { ForeignOriginWebSocket, subscriptionClient } from '../../test/support/subscriptions.js';
import { createTestApp, TEST_SECRETS, type TestApp, testEnv } from '../../test/support/test-app.js';
import { MAX_TOKENS } from '../graphql/armor.js';

const ARTWORK_CHANGED = /* GraphQL */ `
  subscription Changes($slug: String!) {
    artworkChanged(slug: $slug) {
      slug
      kind
      action
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

describe('artworkChanged over graphql-ws', () => {
  const upstreams = new FakeUpstreams();
  let gateway: TestApp;
  let client: Client | undefined;

  beforeAll(async () => {
    await upstreams.start();
    gateway = await createTestApp({ env: testEnv(upstreams) });
  });

  afterEach(async () => {
    await client?.dispose();
    client = undefined;
  });

  afterAll(async () => {
    await gateway.close();
    await upstreams.close();
  });

  it("delivers a commerce change to that artwork's subscribers, with the artwork as it is now", async () => {
    client = subscriptionClient(gateway.url);
    const changes = client.iterate({ query: ARTWORK_CHANGED, variables: { slug: 'melencolia-i' } });
    const first = changes.next();
    await vi.waitFor(() => {
      expect(gateway.pubSub.subscribers).toBe(1);
    });

    const secret = TEST_SECRETS.COMMERCE_HOOK_SECRET;
    await deliver(
      gateway,
      '/hooks/commerce',
      commerceEvent({ subject: { productId: 2, slug: 'the-rhinoceros', variantIds: [] } }),
      { secret },
    );
    await deliver(
      gateway,
      '/hooks/commerce',
      commerceEvent({ type: 'stock', occurredAt: '2026-10-05T12:30:00.000Z' }),
      { secret },
    );

    expect((await first).value).toEqual({
      data: {
        artworkChanged: {
          slug: 'melencolia-i',
          kind: 'STOCK',
          action: 'UPDATED',
          occurredAt: '2026-10-05T12:30:00.000Z',
          artwork: { title: 'Melencolia I', priceFrom: { amount: 5500 } },
        },
      },
    });
    await changes.return?.();
    await vi.waitFor(() => {
      expect(gateway.pubSub.subscribers).toBe(0);
    });
  });

  it('closes a connection opened from another site', async () => {
    client = subscriptionClient(gateway.url, ForeignOriginWebSocket);
    const closed = new Promise<number>((resolve) => {
      client?.on('closed', (event) => {
        resolve((event as { code: number }).code);
      });
    });

    void client
      .iterate({ query: ARTWORK_CHANGED, variables: { slug: 'melencolia-i' } })
      .next()
      .catch(() => undefined);

    expect(await closed).toBe(4403);
  });

  it('prices a subscription like a query, which graphql-ws would otherwise skip', async () => {
    const heavy = Array.from(
      { length: 15 },
      (_, index) =>
        `a${index}: artwork { sizes { size price { amount currencyCode } } story { blocks { ... on ParagraphBlock { text { text bold italic href } } } } }`,
    ).join(' ');
    client = subscriptionClient(gateway.url);

    const refused = client
      .iterate({ query: `subscription { artworkChanged(slug: "melencolia-i") { ${heavy} } }` })
      .next();

    await expect(refused).rejects.toEqual([
      expect.objectContaining({
        extensions: expect.objectContaining({ code: 'QUERY_TOO_COMPLEX' }),
      }),
    ]);
  });

  it('refuses an over-long subscription document while parsing it', async () => {
    const fields = Array.from({ length: MAX_TOKENS }, () => '__typename').join(' ');
    client = subscriptionClient(gateway.url);

    const refused = client
      .iterate({ query: `subscription { artworkChanged(slug: "melencolia-i") { ${fields} } }` })
      .next();

    await expect(refused).rejects.toEqual([
      expect.objectContaining({ message: expect.stringMatching(/token/i) }),
    ]);
  });
});
