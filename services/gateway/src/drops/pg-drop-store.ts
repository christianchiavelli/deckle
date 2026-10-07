import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt, inArray, lte, or, sql } from 'drizzle-orm';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import pg from 'pg';
import { z } from 'zod';
import { DATABASE, type Database } from '../database/database.js';
import { DropEvents } from './drop-events.js';
import {
  type ClaimOutcome,
  type CopyStatus,
  type DropRecord,
  type DropStock,
  DropStore,
  type OwnedCopy,
  type SaleOutcome,
} from './drop-store.js';
import { dropCopies, drops } from './drops.table.js';

/** A copy given back: no holder, no deadline. */
const OPEN = { status: 'open', holderId: null, heldUntil: null, claimedAt: null } as const;

/** Lapsed holds are opened a batch at a time, so a backlog never holds a long lock. */
const SWEEP_BATCH = 500;

/** Whole seconds left on a hold, by the database's clock. */
const secondsLeft = sql<number>`greatest(ceil(extract(epoch from ${dropCopies.heldUntil} - now())), 0)::int`;

/** Copies a person still has: bought, or held and not yet run out. */
const stillTheirs = or(
  eq(dropCopies.status, 'sold'),
  and(eq(dropCopies.status, 'held'), gt(dropCopies.heldUntil, sql`now()`)),
);

/** Raw rows bypass Drizzle's column mapping, so the deadline comes back as epoch milliseconds. */
const heldRow = z.object({
  number: z.int(),
  held_until_ms: z.number().transform((ms) => new Date(ms)),
  seconds_left: z.int(),
});

const sweptRow = z.object({ drop_slug: z.string() });

/** The index a unique violation names, if the error is one. */
function violatedIndex(error: unknown): string | null {
  const cause = error instanceof DrizzleQueryError ? error.cause : error;
  return cause instanceof pg.DatabaseError && cause.code === '23505'
    ? (cause.constraint ?? null)
    : null;
}

@Injectable()
export class PgDropStore extends DropStore {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: DropEvents,
  ) {
    super();
  }

  async record(records: readonly DropRecord[]): Promise<readonly string[]> {
    const recorded: string[] = [];
    for (const drop of records) {
      await this.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(drops)
          .values(drop)
          .onConflictDoNothing()
          .returning({ slug: drops.slug });
        if (inserted === undefined) return;
        await tx.insert(dropCopies).values(
          Array.from({ length: drop.editionSize }, (_, index) => ({
            dropSlug: drop.slug,
            number: index + 1,
            status: 'open',
          })),
        );
        recorded.push(drop.slug);
      });
    }
    return recorded;
  }

  async drops(): Promise<readonly DropRecord[]> {
    return this.db
      .select({
        slug: drops.slug,
        artworkSlug: drops.artworkSlug,
        editionSize: drops.editionSize,
        opensAt: drops.opensAt,
      })
      .from(drops)
      .orderBy(asc(drops.opensAt), asc(drops.slug));
  }

  async drop(slug: string): Promise<DropRecord | null> {
    const [found] = await this.db
      .select({
        slug: drops.slug,
        artworkSlug: drops.artworkSlug,
        editionSize: drops.editionSize,
        opensAt: drops.opensAt,
      })
      .from(drops)
      .where(eq(drops.slug, slug));
    return found ?? null;
  }

  async stock(slugs: readonly string[]): Promise<ReadonlyMap<string, DropStock>> {
    if (slugs.length === 0) return new Map();
    const rows = await this.db
      .select({
        dropSlug: dropCopies.dropSlug,
        // A hold that ran out is open again by the clock, before the sweeper says so.
        status: sql<CopyStatus>`case when ${dropCopies.status} = 'held' and ${dropCopies.heldUntil} <= now() then 'open' else ${dropCopies.status} end`,
      })
      .from(dropCopies)
      .where(inArray(dropCopies.dropSlug, [...slugs]))
      .orderBy(asc(dropCopies.dropSlug), asc(dropCopies.number));
    const copies = new Map<string, CopyStatus[]>();
    for (const row of rows) {
      const list = copies.get(row.dropSlug) ?? [];
      list.push(row.status);
      copies.set(row.dropSlug, list);
    }
    return new Map(
      [...copies].map(([slug, list]) => [
        slug,
        {
          open: list.filter((status) => status === 'open').length,
          held: list.filter((status) => status === 'held').length,
          sold: list.filter((status) => status === 'sold').length,
          copies: list,
        },
      ]),
    );
  }

  async claim(slug: string, userId: string, holdMinutes: number): Promise<ClaimOutcome> {
    try {
      return await this.db.transaction(async (tx): Promise<ClaimOutcome> => {
        const [drop] = await tx
          .select({ open: sql<boolean>`${drops.opensAt} <= now()` })
          .from(drops)
          .where(eq(drops.slug, slug));
        if (drop === undefined) return { kind: 'no-drop' };
        if (!drop.open) return { kind: 'not-open' };

        // A hold of theirs that ran out, here or in another drop, no longer counts.
        const lapsed = await tx
          .update(dropCopies)
          .set(OPEN)
          .where(
            and(
              eq(dropCopies.holderId, userId),
              eq(dropCopies.status, 'held'),
              lte(dropCopies.heldUntil, sql`now()`),
            ),
          )
          .returning({ dropSlug: dropCopies.dropSlug });
        for (const { dropSlug } of lapsed) {
          if (dropSlug !== slug) await this.events.changed(dropSlug, tx);
        }
        // The indexes enforce both rules; asking first spares a refused update.
        const theirs = await tx
          .select({ dropSlug: dropCopies.dropSlug, status: dropCopies.status })
          .from(dropCopies)
          .where(
            and(
              eq(dropCopies.holderId, userId),
              or(eq(dropCopies.dropSlug, slug), eq(dropCopies.status, 'held')),
            ),
          );
        if (theirs.some((copy) => copy.dropSlug === slug)) return { kind: 'already-has' };
        if (theirs.length > 0) return { kind: 'holding-another' };

        // The lowest open number. A copy another claim has locked is skipped, not
        // waited for: a thousand claims at once each take a different row.
        const { rows } = await tx.execute(sql`
          with next as (
            select ${dropCopies.number} as number
            from ${dropCopies}
            where ${dropCopies.dropSlug} = ${slug}
              and (${dropCopies.status} = 'open'
                or (${dropCopies.status} = 'held' and ${dropCopies.heldUntil} <= now()))
            order by ${dropCopies.number}
            limit 1
            for update skip locked
          )
          update ${dropCopies}
          set status = 'held',
              holder_id = ${userId},
              held_until = now() + make_interval(mins => ${holdMinutes}),
              claimed_at = now()
          from next
          where ${dropCopies.dropSlug} = ${slug} and ${dropCopies.number} = next.number
          returning ${dropCopies.number} as number,
                    extract(epoch from ${dropCopies.heldUntil})::float8 * 1000 as held_until_ms,
                    ${secondsLeft} as seconds_left
        `);
        const [held] = z.array(heldRow).parse(rows);
        if (held === undefined) return { kind: 'no-copy' };
        await this.events.changed(slug, tx);
        return {
          kind: 'held',
          copy: {
            drop: slug,
            number: held.number,
            status: 'held',
            heldUntil: held.held_until_ms,
            secondsLeft: held.seconds_left,
            orderCode: null,
          },
        };
      });
    } catch (error) {
      // A second tab of the same person, a moment behind the first: the index decides.
      const index = violatedIndex(error);
      if (index === 'drop_copies_one_per_person_idx') return { kind: 'already-has' };
      if (index === 'drop_copies_one_hold_per_person_idx') return { kind: 'holding-another' };
      throw error;
    }
  }

  async release(slug: string, userId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // A copy being paid for is locked, so this waits for the payment and then finds it sold.
      const released = await tx
        .update(dropCopies)
        .set(OPEN)
        .where(
          and(
            eq(dropCopies.dropSlug, slug),
            eq(dropCopies.holderId, userId),
            eq(dropCopies.status, 'held'),
          ),
        )
        .returning({ number: dropCopies.number });
      if (released.length === 0) return false;
      await this.events.changed(slug, tx);
      return true;
    });
  }

  async copiesOf(userId: string): Promise<readonly OwnedCopy[]> {
    const rows = await this.db
      .select({
        drop: dropCopies.dropSlug,
        number: dropCopies.number,
        status: dropCopies.status,
        heldUntil: dropCopies.heldUntil,
        secondsLeft: sql<
          number | null
        >`case when ${dropCopies.status} = 'held' then ${secondsLeft} end`,
        orderCode: dropCopies.orderCode,
      })
      .from(dropCopies)
      .where(and(eq(dropCopies.holderId, userId), stillTheirs))
      .orderBy(asc(dropCopies.claimedAt));
    return rows.map((row) => ({ ...row, status: row.status === 'sold' ? 'sold' : 'held' }));
  }

  async sell(
    slug: string,
    userId: string,
    pay: (copy: OwnedCopy) => Promise<string>,
  ): Promise<SaleOutcome> {
    return this.db.transaction(async (tx): Promise<SaleOutcome> => {
      const theirs = and(
        eq(dropCopies.dropSlug, slug),
        eq(dropCopies.holderId, userId),
        eq(dropCopies.status, 'held'),
      );
      // Locked for the whole payment. Skipped rather than waited for: a copy already
      // locked is a payment under way, and a second one is turned away, not queued.
      const [copy] = await tx
        .select({
          number: dropCopies.number,
          heldUntil: dropCopies.heldUntil,
          secondsLeft,
          live: sql<boolean>`${dropCopies.heldUntil} > now()`,
        })
        .from(dropCopies)
        .where(theirs)
        .for('update', { skipLocked: true });
      if (copy === undefined) {
        const [busy] = await tx
          .select({ number: dropCopies.number })
          .from(dropCopies)
          .where(theirs);
        return busy === undefined ? { kind: 'no-hold' } : { kind: 'in-progress' };
      }
      if (!copy.live) return { kind: 'no-hold' };
      const held: OwnedCopy = {
        drop: slug,
        number: copy.number,
        status: 'held',
        heldUntil: copy.heldUntil,
        secondsLeft: copy.secondsLeft,
        orderCode: null,
      };
      // Past this point a hold that runs out mid-payment still ends sold: it was paid in time.
      const orderCode = await pay(held);
      await tx
        .update(dropCopies)
        .set({ status: 'sold', heldUntil: null, orderCode, soldAt: sql`now()` })
        .where(and(eq(dropCopies.dropSlug, slug), eq(dropCopies.number, copy.number)));
      await this.events.changed(slug, tx);
      return {
        kind: 'sold',
        copy: { ...held, status: 'sold', heldUntil: null, secondsLeft: null, orderCode },
      };
    });
  }

  async releaseExpired(): Promise<readonly string[]> {
    return this.db.transaction(async (tx) => {
      // A copy being paid for is locked and skipped: a payment started in time finishes.
      const { rows } = await tx.execute(sql`
        with lapsed as (
          select ${dropCopies.dropSlug} as drop_slug, ${dropCopies.number} as number
          from ${dropCopies}
          where ${dropCopies.status} = 'held' and ${dropCopies.heldUntil} <= now()
          order by ${dropCopies.heldUntil}
          limit ${SWEEP_BATCH}
          for update skip locked
        )
        update ${dropCopies}
        set status = 'open', holder_id = null, held_until = null, claimed_at = null
        from lapsed
        where ${dropCopies.dropSlug} = lapsed.drop_slug and ${dropCopies.number} = lapsed.number
        returning ${dropCopies.dropSlug} as drop_slug
      `);
      const slugs = [
        ...new Set(
          z
            .array(sweptRow)
            .parse(rows)
            .map((row) => row.drop_slug),
        ),
      ];
      for (const slug of slugs) await this.events.changed(slug, tx);
      return slugs;
    });
  }
}
