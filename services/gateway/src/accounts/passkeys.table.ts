import { sql } from 'drizzle-orm';
import { bigint, boolean, check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sessions } from '../sessions/sessions.table.js';
import { users } from './users.table.js';

/** The public half of each passkey, and what the next sign-in is checked against. */
export const passkeys = pgTable(
  'passkeys',
  {
    /** The credential id, base64url, as the authenticator gave it. */
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** The COSE public key, base64url. */
    publicKey: text('public_key').notNull(),
    /** The signature counter; an authenticator that keeps none always sends 0. */
    counter: bigint('counter', { mode: 'number' }).notNull(),
    transports: text('transports').array().notNull(),
    /** `singleDevice` or `multiDevice`: whether the passkey is synced between devices. */
    deviceType: text('device_type').notNull(),
    backedUp: boolean('backed_up').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [index('passkeys_user_id_idx').on(table.userId)],
);

/**
 * A passkey ceremony under way in one browser: the challenge the device must
 * sign, used once. Making a passkey also carries the account id it will have.
 */
export const passkeyCeremonies = pgTable(
  'passkey_ceremonies',
  {
    sessionId: text('session_id')
      .primaryKey()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(),
    challenge: text('challenge').notNull(),
    userId: uuid('user_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      'passkey_ceremonies_purpose_check',
      sql`(${table.purpose} = 'register' and ${table.userId} is not null) or (${table.purpose} = 'sign-in' and ${table.userId} is null)`,
    ),
  ],
);
