import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * A Deckle account: no name, no password, no address, only the id its passkeys
 * and its drop copies point to. Commerce knows the same id as its customer's.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
