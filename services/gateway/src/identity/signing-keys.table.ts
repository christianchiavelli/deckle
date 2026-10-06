import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { JWK } from 'jose';

/**
 * The keys the gateway signs commerce tokens with. One is active at a time; a
 * rotation adds the next with a later `not_before`, so it is published in the
 * JWKS before anything is signed with it, and gives the old one a `not_after`,
 * after which it stays published until tokens signed with it have expired.
 */
export const signingKeys = pgTable(
  'signing_keys',
  {
    kid: text('kid').primaryKey(),
    algorithm: text('algorithm').notNull(),
    publicJwk: jsonb('public_jwk').$type<JWK>().notNull(),
    privateJwk: jsonb('private_jwk').$type<JWK>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    notBefore: timestamp('not_before', { withTimezone: true }).notNull().defaultNow(),
    notAfter: timestamp('not_after', { withTimezone: true }),
  },
  (table) => [index('signing_keys_not_before_idx').on(table.notBefore)],
);
