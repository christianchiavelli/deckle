import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { connect, connectMigrated, startPostgres } from '../../test/support/postgres.js';
import { users } from '../accounts/users.table.js';
import type { Database } from '../database/database.js';
import { PubSub } from '../pubsub/pubsub.js';
import { DropEvents } from './drop-events.js';
import type { ClaimOutcome, DropRecord } from './drop-store.js';
import { dropCopies } from './drops.table.js';
import { PgDropStore } from './pg-drop-store.js';

const MELENCOLIA: DropRecord = {
  slug: 'melencolia-i-numbered',
  artworkSlug: 'melencolia-i',
  editionSize: 50,
  opensAt: new Date(Date.now() - 60_000),
};

const WAVE: DropRecord = {
  slug: 'the-great-wave-numbered',
  artworkSlug: 'under-the-wave-off-kanagawa',
  editionSize: 50,
  opensAt: new Date(Date.now() - 60_000),
};

/** Records which drops were announced; the pub/sub's own suite proves delivery on commit. */
class RecordingPubSub extends PubSub {
  readonly topics: string[] = [];

  publish(topic: string): Promise<void> {
    this.topics.push(topic);
    return Promise.resolve();
  }

  subscribe(): AsyncIterableIterator<never> {
    throw new Error('not used');
  }

  isListening(): boolean {
    return true;
  }
}

function storeOn(db: Database) {
  const pubSub = new RecordingPubSub();
  return { store: new PgDropStore(db, new DropEvents(pubSub)), pubSub };
}

async function accounts(db: Database, count: number): Promise<string[]> {
  const ids = Array.from({ length: count }, () => randomUUID());
  for (let index = 0; index < ids.length; index += 500) {
    await db.insert(users).values(ids.slice(index, index + 500).map((id) => ({ id })));
  }
  return ids;
}

/** Makes a hold run out, as ten minutes would. */
async function lapse(db: Database, slug: string, holder: string) {
  await db
    .update(dropCopies)
    .set({ heldUntil: sql`now() - interval '1 second'` })
    .where(and(eq(dropCopies.dropSlug, slug), eq(dropCopies.holderId, holder)));
}

const count = (outcomes: readonly ClaimOutcome[], kind: ClaimOutcome['kind']) =>
  outcomes.filter((outcome) => outcome.kind === kind).length;

describe('PgDropStore on Postgres 18', () => {
  it('records a drop once, with a row for each numbered copy', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const { store } = storeOn(connection.db);

    expect(await store.record([MELENCOLIA, WAVE])).toEqual([MELENCOLIA.slug, WAVE.slug]);
    expect(await store.record([{ ...MELENCOLIA, editionSize: 70 }])).toEqual([]);

    const stock = (await store.stock([MELENCOLIA.slug])).get(MELENCOLIA.slug);
    expect(stock).toMatchObject({ open: 50, held: 0, sold: 0 });
    expect(stock?.copies).toHaveLength(50);
    expect((await store.drops()).map((drop) => drop.slug)).toEqual([MELENCOLIA.slug, WAVE.slug]);
    expect(await store.drop('nothing')).toBeNull();
  });

  it('never hands out a fifty-first copy, to a thousand claims at once from two replicas', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    // A second pool, as a second gateway replica has: the lock is the database's, not a process's.
    await using replica = connect(postgres.getConnectionUri());
    const first = storeOn(connection.db).store;
    const second = storeOn(replica.db).store;
    await first.record([MELENCOLIA]);
    const people = await accounts(connection.db, 1000);

    const outcomes = await Promise.all(
      people.map((person, index) =>
        (index % 2 === 0 ? first : second).claim(MELENCOLIA.slug, person, 10),
      ),
    );

    expect(count(outcomes, 'held')).toBe(50);
    expect(count(outcomes, 'no-copy')).toBe(950);
    const held = await connection.db
      .select({ number: dropCopies.number, holder: dropCopies.holderId })
      .from(dropCopies)
      .where(eq(dropCopies.status, 'held'));
    expect(new Set(held.map((copy) => copy.number)).size).toBe(50);
    expect(new Set(held.map((copy) => copy.holder)).size).toBe(50);
  });

  it('gives one copy per person, even to two tabs claiming at once', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const { store } = storeOn(connection.db);
    await store.record([MELENCOLIA, WAVE]);
    const [ana = ''] = await accounts(connection.db, 1);

    const outcomes = await Promise.all(
      Array.from({ length: 20 }, () => store.claim(MELENCOLIA.slug, ana, 10)),
    );

    expect(count(outcomes, 'held')).toBe(1);
    expect(count(outcomes, 'already-has') + count(outcomes, 'holding-another')).toBe(19);
    expect((await store.claim(WAVE.slug, ana, 10)).kind).toBe('holding-another');
  });

  it('opens nothing before its hour, and knows no drop it never recorded', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const { store } = storeOn(connection.db);
    await store.record([{ ...WAVE, opensAt: new Date(Date.now() + 60_000) }]);
    const [ana = ''] = await accounts(connection.db, 1);

    expect((await store.claim(WAVE.slug, ana, 10)).kind).toBe('not-open');
    expect((await store.claim('no-such-drop', ana, 10)).kind).toBe('no-drop');
  });

  it("counts a lapsed hold as open by the database's clock, and lets its holder try again", async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const { store, pubSub } = storeOn(connection.db);
    await store.record([MELENCOLIA, WAVE]);
    const [ana = '', bo = ''] = await accounts(connection.db, 2);
    const held = await store.claim(MELENCOLIA.slug, ana, 10);
    expect(held).toMatchObject({ kind: 'held', copy: { number: 1, status: 'held' } });
    if (held.kind === 'held') {
      expect(held.copy.secondsLeft).toBeGreaterThan(595);
      expect(held.copy.secondsLeft).toBeLessThanOrEqual(600);
    }

    await lapse(connection.db, MELENCOLIA.slug, ana);

    expect((await store.stock([MELENCOLIA.slug])).get(MELENCOLIA.slug)?.open).toBe(50);
    expect(await store.copiesOf(ana)).toEqual([]);
    // Bo takes copy 1 back from the lapsed hold; Ana may claim again, in another drop too.
    expect(await store.claim(MELENCOLIA.slug, bo, 10)).toMatchObject({ copy: { number: 1 } });
    pubSub.topics.length = 0;
    expect((await store.claim(WAVE.slug, ana, 10)).kind).toBe('held');
    expect(pubSub.topics).toEqual([`drop-changed:${WAVE.slug}`]);
  });

  it('lets its holder give a copy back, but never a sold one', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const { store } = storeOn(connection.db);
    await store.record([MELENCOLIA]);
    const [ana = '', bo = ''] = await accounts(connection.db, 2);
    await store.claim(MELENCOLIA.slug, ana, 10);
    await store.claim(MELENCOLIA.slug, bo, 10);

    expect(await store.release(MELENCOLIA.slug, ana)).toBe(true);
    expect(await store.release(MELENCOLIA.slug, ana)).toBe(false);
    await store.sell(MELENCOLIA.slug, bo, () => Promise.resolve('DKBO0001'));
    expect(await store.release(MELENCOLIA.slug, bo)).toBe(false);

    expect(await store.copiesOf(bo)).toEqual([
      {
        drop: MELENCOLIA.slug,
        number: 2,
        status: 'sold',
        heldUntil: null,
        secondsLeft: null,
        orderCode: 'DKBO0001',
      },
    ]);
  });

  it('keeps a copy locked while it is paid for: the sweeper and a second payment wait it out', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const { store } = storeOn(connection.db);
    await store.record([MELENCOLIA]);
    const [ana = ''] = await accounts(connection.db, 1);
    await store.claim(MELENCOLIA.slug, ana, 10);
    // A hold with two seconds left, which run out while commerce takes the payment.
    await connection.pool.query(
      "update drop_copies set held_until = now() + interval '2 seconds' where holder_id = $1",
      [ana],
    );
    const paying = Promise.withResolvers<string>();
    const started = Promise.withResolvers<undefined>();
    const sale = store.sell(MELENCOLIA.slug, ana, () => {
      started.resolve(undefined);
      return paying.promise;
    });

    try {
      await started.promise;
      await new Promise((resolve) => setTimeout(resolve, 2500));

      expect(await store.releaseExpired()).toEqual([]);
      expect(await store.sell(MELENCOLIA.slug, ana, () => Promise.resolve('DKSECOND'))).toEqual({
        kind: 'in-progress',
      });
    } finally {
      // Whatever failed above, the payment ends, or the pool would wait for it forever.
      paying.resolve('DKANA001');
    }

    expect(await sale).toMatchObject({ kind: 'sold', copy: { number: 1, orderCode: 'DKANA001' } });
    const [copy] = await connection.db
      .select({ status: dropCopies.status, heldUntil: dropCopies.heldUntil })
      .from(dropCopies)
      .where(eq(dropCopies.holderId, ana));
    expect(copy).toEqual({ status: 'sold', heldUntil: null });
  });

  it('leaves the copy held when the payment fails, and refuses one for a hold that ran out', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const { store } = storeOn(connection.db);
    await store.record([MELENCOLIA]);
    const [ana = ''] = await accounts(connection.db, 1);
    await store.claim(MELENCOLIA.slug, ana, 10);

    await expect(
      store.sell(MELENCOLIA.slug, ana, () => Promise.reject(new Error('declined'))),
    ).rejects.toThrow('declined');
    expect((await store.copiesOf(ana)).map((copy) => copy.status)).toEqual(['held']);

    await lapse(connection.db, MELENCOLIA.slug, ana);
    expect(await store.sell(MELENCOLIA.slug, ana, () => Promise.resolve('DKLATE01'))).toEqual({
      kind: 'no-hold',
    });
  });

  it('opens lapsed holds again, announcing each drop once, and leaves live ones', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const { store, pubSub } = storeOn(connection.db);
    await store.record([MELENCOLIA, WAVE]);
    const [ana = '', bo = '', cy = ''] = await accounts(connection.db, 3);
    await store.claim(MELENCOLIA.slug, ana, 10);
    await store.claim(MELENCOLIA.slug, bo, 10);
    await store.claim(WAVE.slug, cy, 10);
    await lapse(connection.db, MELENCOLIA.slug, ana);
    await lapse(connection.db, MELENCOLIA.slug, bo);
    pubSub.topics.length = 0;

    expect(await store.releaseExpired()).toEqual([MELENCOLIA.slug]);
    expect(pubSub.topics).toEqual([`drop-changed:${MELENCOLIA.slug}`]);
    expect((await store.stock([MELENCOLIA.slug, WAVE.slug])).get(WAVE.slug)?.held).toBe(1);
    expect(await store.releaseExpired()).toEqual([]);
  });

  it('refuses, by its constraints, a copy written half held', async () => {
    await using postgres = await startPostgres();
    await using connection = await connectMigrated(postgres.getConnectionUri());
    const { store } = storeOn(connection.db);
    await store.record([MELENCOLIA]);

    await expect(
      connection.pool.query(
        "update drop_copies set status = 'held' where drop_slug = $1 and number = 1",
        [MELENCOLIA.slug],
      ),
    ).rejects.toThrow(/drop_copies_status_check/);
  });
});
