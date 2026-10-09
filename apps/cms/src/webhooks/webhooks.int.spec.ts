import {
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload';
import { aroundAll, describe, expect, it } from 'vitest';
import { migrations } from '../migrations';
import type { Story } from '../payload-types';
import { proseFromParagraphs } from '../rich-text/prose';
import { type HookReceiver, signatureIsValid, startHookReceiver } from '../test/hook-receiver';
import { startPayload, stopPayload, testSecrets } from '../test/payload';
import { startPostgres } from '../test/postgres';
import { type CmsEvent, cmsEventSchema } from './event';
import { cmsEventsQueue, deliverCmsEventTaskSlug } from './task';

let payload: Payload;
let receiver: HookReceiver;

aroundAll(async (runSuite) => {
  await using postgres = await startPostgres();
  await using hooks = await startHookReceiver();
  receiver = hooks;
  ({ payload } = await startPayload({
    databaseUrl: postgres.getConnectionUri(),
    hookUrl: hooks.url,
  }));
  try {
    await runSuite();
  } finally {
    await stopPayload(payload);
  }
}, 600_000);

const storyData = (artworkSlug: string) => ({
  artworkSlug,
  title: 'About the woodcut',
  lede: 'Dürer never saw the animal he drew.',
  body: proseFromParagraphs(['He gave it armour plates.']),
  sources: [{ label: 'The Met', url: 'https://www.metmuseum.org/art/collection/search/356497' }],
});

/** Jobs still waiting for the queue, which is how an event exists before it is sent. */
const pendingDeliveries = async (req?: PayloadRequest) =>
  (
    await payload.count({
      collection: 'payload-jobs',
      where: { taskSlug: { equals: deliverCmsEventTaskSlug } },
      ...(req ? { req } : {}),
    })
  ).totalDocs;

/**
 * Runs the queue once, as the in-process runner does every five seconds, and
 * reads what arrived. The runner sends a batch in parallel; one at a time here
 * keeps the order the assertions read.
 */
const runQueue = () => payload.jobs.run({ queue: cmsEventsQueue, sequential: true });

async function deliver(): Promise<CmsEvent[]> {
  const before = receiver.received.length;
  await runQueue();
  return receiver.received.slice(before).map(({ body, signature }) => {
    expect(signatureIsValid(testSecrets.HOOK_SECRET, body, signature)).toBe(true);
    return cmsEventSchema.parse(JSON.parse(body));
  });
}

const summary = (events: CmsEvent[]) =>
  events.map(({ type, action, subject }) => ({ type, action, subject }));

describe('webhooks to the gateway', () => {
  let story: Story;

  it('applies the committed migrations as Payload starts', async () => {
    const { docs } = await payload.find({
      collection: 'payload-migrations',
      sort: 'name',
      limit: 100,
    });
    expect(docs.map((migration) => migration.name)).toEqual(
      migrations.map((migration) => migration.name),
    );
  });

  it('sends one signed event when a story is published', async () => {
    story = await payload.create({
      collection: 'stories',
      data: { ...storyData('the-rhinoceros'), _status: 'published' },
    });
    expect(await pendingDeliveries()).toBe(1);

    const [event, ...rest] = await deliver();
    expect(rest).toEqual([]);
    expect(event).toMatchObject({
      source: 'cms',
      type: 'story',
      action: 'created',
      subject: { slug: 'the-rhinoceros', artworkSlug: 'the-rhinoceros' },
    });
    // Delivered jobs are removed: the queue holds only what is still owed.
    expect(await pendingDeliveries()).toBe(0);
  });

  it('sends nothing for drafts saved over published content, autosaves included', async () => {
    await payload.update({
      collection: 'stories',
      id: story.id,
      data: { title: 'About the famous woodcut' },
      draft: true,
      autosave: true,
    });
    await payload.update({
      collection: 'stories',
      id: story.id,
      data: { title: 'About the woodcut, again' },
      draft: true,
    });
    expect(await pendingDeliveries()).toBe(0);
    expect(await deliver()).toEqual([]);
  });

  it('sends updated when the draft is published', async () => {
    await payload.update({ collection: 'stories', id: story.id, data: { _status: 'published' } });
    expect(summary(await deliver())).toEqual([
      {
        type: 'story',
        action: 'updated',
        subject: { slug: 'the-rhinoceros', artworkSlug: 'the-rhinoceros' },
      },
    ]);
    const published = await payload.findByID({ collection: 'stories', id: story.id });
    expect(published.title).toBe('About the woodcut, again');
  });

  it('sends deleted when a story is unpublished, and created when it comes back', async () => {
    await payload.update({ collection: 'stories', id: story.id, data: { _status: 'draft' } });
    expect(summary(await deliver())).toMatchObject([{ action: 'deleted' }]);

    await payload.update({ collection: 'stories', id: story.id, data: { _status: 'published' } });
    expect(summary(await deliver())).toMatchObject([{ action: 'created' }]);
  });

  it('moves a story whose artwork changes: deleted at the old slug, created at the new', async () => {
    await payload.update({
      collection: 'stories',
      id: story.id,
      data: { artworkSlug: 'rhinoceros', _status: 'published' },
    });
    expect(summary(await deliver())).toEqual([
      {
        type: 'story',
        action: 'deleted',
        subject: { slug: 'the-rhinoceros', artworkSlug: 'the-rhinoceros' },
      },
      {
        type: 'story',
        action: 'created',
        subject: { slug: 'rhinoceros', artworkSlug: 'rhinoceros' },
      },
    ]);
  });

  it('sends deleted when a published story is deleted, nothing for a deleted draft', async () => {
    await payload.delete({ collection: 'stories', id: story.id });
    expect(summary(await deliver())).toMatchObject([
      { action: 'deleted', subject: { artworkSlug: 'rhinoceros' } },
    ]);

    const draft = await payload.create({
      collection: 'stories',
      data: storyData('melencolia-i'),
      draft: true,
    });
    await payload.delete({ collection: 'stories', id: draft.id });
    expect(await pendingDeliveries()).toBe(0);
  });

  it('names curations and drop pages by their own slug', async () => {
    await payload.create({
      collection: 'curations',
      data: {
        title: 'First impressions',
        slug: 'first-impressions',
        artworks: ['melencolia-i'],
        _status: 'published',
      },
    });
    await payload.create({
      collection: 'drop-pages',
      data: {
        slug: 'great-wave-numbered',
        artworkSlug: 'under-the-wave-off-kanagawa',
        headline: 'The Great Wave, numbered',
        body: proseFromParagraphs(['Fifty prints.']),
        _status: 'published',
      },
    });
    expect(summary(await deliver())).toEqual([
      { type: 'curation', action: 'created', subject: { slug: 'first-impressions' } },
      { type: 'drop-page', action: 'created', subject: { slug: 'great-wave-numbered' } },
    ]);
  });

  it('retries a failed delivery with the same event id, freshly signed', async () => {
    receiver.answerNext(503);
    await payload.create({
      collection: 'stories',
      data: { ...storyData('knight-death-and-the-devil'), _status: 'published' },
    });

    const firstTry = receiver.received.length;
    await runQueue();
    expect(receiver.received.at(-1)?.status).toBe(503);
    expect(await pendingDeliveries()).toBe(1);

    // The first retry waits 2^0 × 2 s; until then the job is not picked up again.
    await runQueue();
    expect(receiver.received).toHaveLength(firstTry + 1);
    await new Promise((resolve) => setTimeout(resolve, 2_200));
    await runQueue();

    const [failed, delivered] = receiver.received.slice(firstTry);
    expect(delivered?.status).toBe(204);
    expect(delivered?.body).toBe(failed?.body);
    expect(
      signatureIsValid(
        testSecrets.HOOK_SECRET,
        delivered?.body ?? '',
        delivered?.signature ?? null,
      ),
    ).toBe(true);
    expect(await pendingDeliveries()).toBe(0);
  });

  it('queues the event in the same transaction as the change', async () => {
    const req = await createLocalReq({}, payload);
    await initTransaction(req);
    await payload.create({
      collection: 'stories',
      data: { ...storyData('the-sleep-of-reason-produces-monsters'), _status: 'published' },
      req,
    });
    // Inside the transaction the event is queued; outside it, nothing exists yet.
    expect(await pendingDeliveries(req)).toBe(1);
    expect(await pendingDeliveries()).toBe(0);
    await killTransaction(req);

    const { totalDocs } = await payload.count({
      collection: 'stories',
      where: { artworkSlug: { equals: 'the-sleep-of-reason-produces-monsters' } },
    });
    expect(totalDocs).toBe(0);
    expect(await pendingDeliveries()).toBe(0);
  });

  it('refuses rich text the gateway could not map', async () => {
    const list = {
      root: {
        type: 'root',
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
        children: [{ type: 'list', listType: 'bullet', tag: 'ul', version: 1, children: [] }],
      },
    } as unknown as Story['body'];
    await expect(
      payload.create({
        collection: 'stories',
        data: { ...storyData('under-the-wave-off-kanagawa'), body: list, _status: 'published' },
      }),
    ).rejects.toThrow(/Body/);
  });
});
