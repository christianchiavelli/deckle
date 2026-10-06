import type { Payload } from 'payload';
import { aroundAll, describe, expect, it } from 'vitest';
import { type HookReceiver, signatureIsValid, startHookReceiver } from '../test/hook-receiver';
import { startPayload, testSecrets } from '../test/payload';
import { startPostgres } from '../test/postgres';
import { cmsEventSchema } from '../webhooks/event';
import { createCmsClient } from './cms-client';
import { firstImpressions, storySeeds } from './content';
import { gatewayUserEmail, seed, type SeedInput } from './seed';

let payload: Payload;
let receiver: HookReceiver;
let api: typeof fetch;

aroundAll(async (runSuite) => {
  await using postgres = await startPostgres();
  await using hooks = await startHookReceiver();
  receiver = hooks;
  ({ payload, fetch: api } = await startPayload({
    databaseUrl: postgres.getConnectionUri(),
    hookUrl: hooks.url,
  }));
  try {
    await runSuite();
  } finally {
    await payload.destroy();
  }
}, 600_000);

const base = 'http://cms.test/api';

const input: SeedInput = {
  admin: { email: 'admin@deckle.local', password: 'integration-admin-password' },
  gatewayApiKey: 'integration-gateway-api-key-0000000000000',
  curations: [firstImpressions],
  stories: storySeeds,
};

const asGateway = { authorization: `users API-Key ${input.gatewayApiKey}` };

const get = async (path: string, headers: HeadersInit = {}) => {
  const response = await api(`${base}${path}`, { headers });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
};

describe('the seed', () => {
  it('creates the admin, the gateway user, the curation and the stories', async () => {
    const steps = await seed(createCmsClient(base, api), input);
    expect(steps).toEqual([
      { what: 'admin admin@deckle.local', outcome: 'created' },
      { what: `gateway user ${gatewayUserEmail}`, outcome: 'created' },
      { what: 'curation first-impressions', outcome: 'created' },
      { what: 'story melencolia-i', outcome: 'created' },
      { what: 'story the-rhinoceros', outcome: 'created' },
      { what: 'story under-the-wave-off-kanagawa', outcome: 'created' },
    ]);
  });

  it('publishes the stories with their texts exactly as given', async () => {
    const { docs } = await payload.find({ collection: 'stories', sort: 'id', depth: 0 });
    expect(
      docs.map((story) => ({
        artworkSlug: story.artworkSlug,
        title: story.title,
        lede: story.lede,
        paragraphs: story.body.root.children.map((paragraph) =>
          (paragraph['children'] as { text: string }[]).map((text) => text.text).join(''),
        ),
        sources: story.sources.map(({ label, url }) => ({ label, url })),
        status: story._status,
      })),
    ).toEqual(storySeeds.map((story) => ({ ...story, status: 'published' })));
  });

  it('publishes the curation with its artworks in order and no invented intro', async () => {
    const { docs } = await payload.find({ collection: 'curations', depth: 0 });
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      title: 'First impressions',
      slug: 'first-impressions',
      artworks: firstImpressions.artworks,
      _status: 'published',
    });
    expect(docs[0]?.intro ?? null).toBeNull();
  });

  it('reports each seeded document to the gateway once, through the running queue', async () => {
    const received = await receiver.waitFor(4, 30_000);
    const events = received.map(({ body, signature }) => {
      expect(signatureIsValid(testSecrets.HOOK_SECRET, body, signature)).toBe(true);
      return cmsEventSchema.parse(JSON.parse(body));
    });
    expect(events.map(({ type, action, subject }) => ({ type, action, subject }))).toEqual(
      expect.arrayContaining([
        { type: 'curation', action: 'created', subject: { slug: 'first-impressions' } },
        ...storySeeds.map(({ artworkSlug }) => ({
          type: 'story',
          action: 'created',
          subject: { slug: artworkSlug, artworkSlug },
        })),
      ]),
    );
    expect(new Set(events.map((event) => event.id)).size).toBe(4);
  });

  it('changes nothing on a second run but setting the API key again', async () => {
    const steps = await seed(createCmsClient(base, api), input);
    expect(steps.map(({ outcome }) => outcome)).toEqual([
      'kept',
      'updated',
      'kept',
      'kept',
      'kept',
      'kept',
    ]);
    expect((await payload.count({ collection: 'users' })).totalDocs).toBe(2);
    expect((await payload.count({ collection: 'stories' })).totalDocs).toBe(3);
    expect((await payload.count({ collection: 'curations' })).totalDocs).toBe(1);

    // Two runs of the five-second queue later, nothing new has been sent.
    await new Promise((resolve) => setTimeout(resolve, 11_000));
    expect(receiver.received).toHaveLength(4);
  }, 30_000);

  it('lets the gateway read by API key, published or draft', async () => {
    const [story] = (
      await payload.find({
        collection: 'stories',
        where: { artworkSlug: { equals: 'melencolia-i' } },
      })
    ).docs;
    await payload.update({
      collection: 'stories',
      id: story!.id,
      data: { title: 'A draft title' },
      draft: true,
    });

    const query = '/stories?where[artworkSlug][equals]=melencolia-i&depth=0';
    const published = await get(query, asGateway);
    expect(published.status).toBe(200);
    expect(published.body['docs']).toMatchObject([{ title: 'About the engraving' }]);

    const draft = await get(`${query}&draft=true`, asGateway);
    expect(draft.body['docs']).toMatchObject([{ title: 'A draft title', _status: 'draft' }]);
  });

  it('lets the gateway change nothing, see no other user and run no jobs', async () => {
    const write = await api(`${base}/stories`, {
      method: 'POST',
      headers: { ...asGateway, 'content-type': 'application/json' },
      body: JSON.stringify({ artworkSlug: 'x', title: 'x' }),
    });
    expect(write.status).toBe(403);

    const users = await get('/users?depth=0', asGateway);
    expect(users.body['docs']).toMatchObject([{ email: gatewayUserEmail, role: 'gateway' }]);
    expect(users.body['totalDocs']).toBe(1);
    expect(JSON.stringify(users.body)).not.toContain(input.gatewayApiKey);

    // Payload's run endpoint answers a refused `jobs.access.run` with 401.
    expect((await get('/payload-jobs/run', asGateway)).status).toBe(401);
  });

  it('shows a visitor without credentials nothing but the editorial images', async () => {
    expect((await get('/stories')).status).toBe(403);
    expect((await get('/curations')).status).toBe(403);
    expect((await get('/drop-pages')).status).toBe(403);
    expect((await get('/media')).status).toBe(200);
  });

  it('answers the health check', async () => {
    expect(await get('/health')).toEqual({ status: 200, body: { status: 'ok' } });
  });

  it('stops with a clear error when the admin password is wrong', async () => {
    const wrong = { ...input, admin: { ...input.admin, password: 'not-the-admin-password' } };
    await expect(seed(createCmsClient(base, api), wrong)).rejects.toThrow(
      /^POST \/users\/login answered 401/,
    );
  });
});
