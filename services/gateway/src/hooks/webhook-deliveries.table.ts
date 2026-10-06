import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Webhook deliveries already handled, by their `id`, so a redelivery is recognised and skipped. */
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey(),
    source: text('source').notNull(),
    type: text('type').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('webhook_deliveries_received_at_idx').on(table.receivedAt)],
);
