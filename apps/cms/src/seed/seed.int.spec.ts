import { sql } from '@payloadcms/db-postgres';
import type { Payload } from 'payload';
import { aroundAll, describe, expect, it } from 'vitest';
import { type HookReceiver, signatureIsValid, startHookReceiver } from '../test/hook-receiver';
import { startPayload, testSecrets } from '../test/payload';
import { startPostgres } from '../test/postgres';
import { cmsEventSchema } from '../webhooks/event';
import { createCmsClient } from './cms-client';
import { curationSeeds, dropPageSeeds, storySeeds } from './content';
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
  curations: curationSeeds,
  stories: storySeeds,
  dropPages: dropPageSeeds,
};

/** One document, and one event for the gateway, per curation, story and drop page. */
const documents = curationSeeds.length + storySeeds.length + dropPageSeeds.length;

const asGateway = { authorization: `users API-Key ${input.gatewayApiKey}` };

/** A rich text's paragraphs as plain text. */
const paragraphsOf = (body: { root: { children: Record<string, unknown>[] } }) =>
  body.root.children.map((paragraph) =>
    (paragraph['children'] as { text: string }[]).map((text) => text.text).join(''),
  );

const get = async (path: string, headers: HeadersInit = {}) => {
  const response = await api(`${base}${path}`, { headers });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
};

describe('the seed', () => {
  it('creates the admin, the gateway user, the curations, the stories and the drop pages', async () => {
    const steps = await seed(createCmsClient(base, api), input);
    expect(steps).toEqual([
      { what: 'admin admin@deckle.local', outcome: 'created' },
      { what: `gateway user ${gatewayUserEmail}`, outcome: 'created' },
      ...curationSeeds.map(({ slug }) => ({ what: `curation ${slug}`, outcome: 'created' })),
      // Created last to first, so the journal opens with the first.
      ...[...storySeeds].reverse().map(({ artworkSlug }) => ({
        what: `story ${artworkSlug}`,
        outcome: 'created',
      })),
      ...dropPageSeeds.map(({ slug }) => ({ what: `drop page ${slug}`, outcome: 'created' })),
    ]);
  });

  it('publishes the stories with their texts exactly as given, the first one newest', async () => {
    const { docs } = await payload.find({
      collection: 'stories',
      sort: '-createdAt',
      depth: 0,
      pagination: false,
    });
    expect(
      docs.map((story) => ({
        artworkSlug: story.artworkSlug,
        title: story.title,
        lede: story.lede,
        detail: story.detail,
        paragraphs: paragraphsOf(story.body),
        sources: story.sources.map(({ label, url }) => ({ label, url })),
        status: story._status,
      })),
    ).toEqual(
      storySeeds.map(({ artworkSlug, title, lede, detail, paragraphs, sources }) => ({
        artworkSlug,
        title,
        lede,
        detail,
        paragraphs,
        sources,
        status: 'published',
      })),
    );
  });

  it('publishes the curations with their artworks in order, and an intro only where one was written', async () => {
    const { docs } = await payload.find({
      collection: 'curations',
      sort: 'id',
      depth: 0,
      pagination: false,
    });
    expect(
      docs.map((curation) => ({
        title: curation.title,
        slug: curation.slug,
        intro: curation.intro ?? null,
        artworks: curation.artworks,
        status: curation._status,
      })),
    ).toEqual(
      curationSeeds.map(({ title, slug, intro, artworks }) => ({
        title,
        slug,
        intro,
        artworks,
        status: 'published',
      })),
    );
  });

  it('publishes the drop pages with their words exactly as given', async () => {
    const { docs } = await payload.find({
      collection: 'drop-pages',
      sort: 'id',
      depth: 0,
      pagination: false,
    });
    expect(
      docs.map((page) => ({
        slug: page.slug,
        artworkSlug: page.artworkSlug,
        headline: page.headline,
        paragraphs: paragraphsOf(page.body),
        status: page._status,
      })),
    ).toEqual(
      dropPageSeeds.map(({ slug, artworkSlug, headline, paragraphs }) => ({
        slug,
        artworkSlug,
        headline,
        paragraphs,
        status: 'published',
      })),
    );
  });

  it('publishes every story, curation and drop page in Portuguese too, with no English fallen back on', async () => {
    const inPortuguese = {
      locale: 'pt',
      fallbackLocale: false,
      depth: 0,
      pagination: false,
    } as const;
    const stories = await payload.find({
      collection: 'stories',
      sort: '-createdAt',
      ...inPortuguese,
    });
    expect(
      stories.docs.map((story) => ({
        title: story.title,
        lede: story.lede,
        paragraphs: paragraphsOf(story.body),
      })),
    ).toEqual(storySeeds.map(({ pt }) => pt));
    const curations = await payload.find({ collection: 'curations', sort: 'id', ...inPortuguese });
    expect(
      curations.docs.map((curation) => ({ title: curation.title, intro: curation.intro ?? null })),
    ).toEqual(curationSeeds.map(({ pt }) => pt));
    const pages = await payload.find({ collection: 'drop-pages', sort: 'id', ...inPortuguese });
    expect(
      pages.docs.map((page) => ({ headline: page.headline, paragraphs: paragraphsOf(page.body) })),
    ).toEqual(dropPageSeeds.map(({ pt }) => pt));
  });

  it('reports each seeded document to the gateway once, through the running queue', async () => {
    const received = await receiver.waitFor(documents, 30_000);
    const events = received.map(({ body, signature }) => {
      expect(signatureIsValid(testSecrets.HOOK_SECRET, body, signature)).toBe(true);
      return cmsEventSchema.parse(JSON.parse(body));
    });
    expect(events.map(({ type, action, subject }) => ({ type, action, subject }))).toEqual(
      expect.arrayContaining([
        ...curationSeeds.map(({ slug }) => ({
          type: 'curation',
          action: 'created',
          subject: { slug },
        })),
        ...storySeeds.map(({ artworkSlug }) => ({
          type: 'story',
          action: 'created',
          subject: { slug: artworkSlug, artworkSlug },
        })),
        ...dropPageSeeds.map(({ slug }) => ({
          type: 'drop-page',
          action: 'created',
          subject: { slug },
        })),
      ]),
    );
    expect(new Set(events.map((event) => event.id)).size).toBe(documents);
  });

  it('changes nothing on a second run but setting the API key again', async () => {
    const steps = await seed(createCmsClient(base, api), input);
    expect(steps.map(({ outcome }) => outcome)).toEqual([
      'kept',
      'updated',
      ...Array<string>(documents).fill('kept'),
    ]);
    expect((await payload.count({ collection: 'users' })).totalDocs).toBe(2);
    expect((await payload.count({ collection: 'stories' })).totalDocs).toBe(storySeeds.length);
    expect((await payload.count({ collection: 'curations' })).totalDocs).toBe(curationSeeds.length);
    expect((await payload.count({ collection: 'drop-pages' })).totalDocs).toBe(
      dropPageSeeds.length,
    );

    // Two runs of the five-second queue later, nothing new has been sent.
    await new Promise((resolve) => setTimeout(resolve, 11_000));
    expect(receiver.received).toHaveLength(documents);
  }, 30_000);

  it('gives the Portuguese to a document an older seed wrote in English only', async () => {
    const [first] = curationSeeds;
    const curation = (
      await payload.find({ collection: 'curations', where: { slug: { equals: first!.slug } } })
    ).docs[0]!;
    // As a stack seeded before there were locales has it: its words in English alone.
    await payload.db.drizzle.execute(
      sql`DELETE FROM "curations_locales" WHERE "_locale" = 'pt' AND "_parent_id" = ${curation.id}`,
    );
    const steps = await seed(createCmsClient(base, api), input);
    expect(steps.find(({ what }) => what === `curation ${first!.slug}`)?.outcome).toBe('updated');
    const translated = await payload.findByID({
      collection: 'curations',
      id: curation.id,
      locale: 'pt',
      fallbackLocale: false,
    });
    expect(translated.title).toBe(first!.pt.title);
  });

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
