import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../accounts/users.table.js';

/** A numbered drop: when it opens and how many copies it has. Commerce holds its price. */
export const drops = pgTable(
  'drops',
  {
    slug: text('slug').primaryKey(),
    artworkSlug: text('artwork_slug').notNull(),
    editionSize: integer('edition_size').notNull(),
    opensAt: timestamp('opens_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('drops_edition_size_check', sql`${table.editionSize} > 0`)],
);

/**
 * One row per numbered copy, made with the drop: there is no fifty-first row to
 * hand out. A claim takes the lowest open row under `FOR UPDATE SKIP LOCKED`, so
 * two claims never take the same one, and the indexes below refuse a second
 * copy to the same person whatever the code asks.
 */
export const dropCopies = pgTable(
  'drop_copies',
  {
    dropSlug: text('drop_slug')
      .notNull()
      .references(() => drops.slug, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    /** `open`, `held` for ten minutes, or `sold`. */
    status: text('status').notNull(),
    holderId: uuid('holder_id').references(() => users.id),
    heldUntil: timestamp('held_until', { withTimezone: true }),
    /** Commerce's order for the copy, once paid. */
    orderCode: text('order_code'),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    soldAt: timestamp('sold_at', { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.dropSlug, table.number] }),
    check('drop_copies_number_check', sql`${table.number} > 0`),
    // Each status carries exactly what it means, so a half-written copy cannot exist.
    check(
      'drop_copies_status_check',
      sql`(${table.status} = 'open' and ${table.holderId} is null and ${table.heldUntil} is null and ${table.orderCode} is null)
        or (${table.status} = 'held' and ${table.holderId} is not null and ${table.heldUntil} is not null and ${table.orderCode} is null)
        or (${table.status} = 'sold' and ${table.holderId} is not null and ${table.heldUntil} is null and ${table.orderCode} is not null)`,
    ),
    // One copy per person in a drop, held or paid.
    uniqueIndex('drop_copies_one_per_person_idx')
      .on(table.dropSlug, table.holderId)
      .where(sql`${table.holderId} is not null`),
    // One copy held at a time per person: commerce keeps one order open per customer.
    uniqueIndex('drop_copies_one_hold_per_person_idx')
      .on(table.holderId)
      .where(sql`${table.status} = 'held'`),
    // What a claim scans, lowest number first.
    index('drop_copies_open_idx')
      .on(table.dropSlug, table.number)
      .where(sql`${table.status} = 'open'`),
    // What the sweeper scans for holds that ran out.
    index('drop_copies_held_until_idx')
      .on(table.heldUntil)
      .where(sql`${table.status} = 'held'`),
  ],
);
