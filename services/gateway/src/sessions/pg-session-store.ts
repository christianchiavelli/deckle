import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../database/database.js';
import {
  type FoundSession,
  type Renewal,
  type SessionChanges,
  type SessionRecord,
  SessionStore,
} from './session-store.js';
import { sessions } from './sessions.table.js';

/** Expired sessions are deleted a batch at a time, so a backlog never holds a long lock. */
const DELETE_BATCH = 1000;

const columns = {
  id: sessions.id,
  userId: sessions.userId,
  cartToken: sessions.cartToken,
  customerToken: sessions.customerToken,
  expiresAt: sessions.expiresAt,
};

@Injectable()
export class PgSessionStore extends SessionStore {
  constructor(@Inject(DATABASE) private readonly db: Database) {
    super();
  }

  async find(id: string, renewal: Renewal): Promise<FoundSession | null> {
    const live = and(eq(sessions.id, id), gt(sessions.expiresAt, sql`now()`));
    const [renewed] = await this.db
      .update(sessions)
      .set({ seenAt: sql`now()`, expiresAt: renewal.until })
      .where(and(live, lt(sessions.seenAt, renewal.ifSeenBefore)))
      .returning(columns);
    if (renewed !== undefined) return { session: renewed, renewed: true };
    const [found] = await this.db.select(columns).from(sessions).where(live);
    return found === undefined ? null : { session: found, renewed: false };
  }

  async update(id: string, changes: SessionChanges): Promise<void> {
    await this.db.update(sessions).set(changes).where(eq(sessions.id, id));
  }

  async replace(oldId: string | null, next: SessionRecord): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (oldId !== null) await tx.delete(sessions).where(eq(sessions.id, oldId));
      await tx.insert(sessions).values(next);
    });
  }

  async deleteExpired(): Promise<number> {
    const expired = this.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(lt(sessions.expiresAt, sql`now()`))
      .limit(DELETE_BATCH)
      // Replicas sweep side by side; each takes rows the others are not deleting.
      .for('update', { skipLocked: true });
    const deleted = await this.db
      .delete(sessions)
      .where(inArray(sessions.id, expired))
      .returning({ id: sessions.id });
    return deleted.length;
  }
}
