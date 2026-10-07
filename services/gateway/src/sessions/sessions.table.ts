import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../accounts/users.table.js';

/**
 * One browser's session. The cookie holds a random secret and this table only
 * its SHA-256, so a copy of the table opens no session. Commerce's own session
 * tokens are kept here, never in the browser: a guest's cart, and the signed-in
 * customer's order for a numbered copy.
 */
export const sessions = pgTable(
  'sessions',
  {
    /** The SHA-256 of the cookie's secret, base64url. */
    id: text('id').primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    /** Commerce's guest session, which holds the cart. */
    cartToken: text('cart_token'),
    /** Commerce's session for the signed-in customer, which holds a copy's order. */
    customerToken: text('customer_token'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    seenAt: timestamp('seen_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('sessions_expires_at_idx').on(table.expiresAt),
    index('sessions_user_id_idx').on(table.userId),
  ],
);
