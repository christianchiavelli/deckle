import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../database/database.js';
import {
  type Account,
  AccountStore,
  type Ceremony,
  type NewPasskey,
  type StoredPasskey,
} from './account-store.js';
import { passkeyCeremonies, passkeys } from './passkeys.table.js';
import { users } from './users.table.js';

@Injectable()
export class PgAccountStore extends AccountStore {
  constructor(@Inject(DATABASE) private readonly db: Database) {
    super();
  }

  async beginCeremony(sessionId: string, ceremony: Ceremony, expiresAt: Date): Promise<void> {
    const values = { ...ceremony, expiresAt };
    await this.db
      .insert(passkeyCeremonies)
      .values({ sessionId, ...values })
      .onConflictDoUpdate({ target: passkeyCeremonies.sessionId, set: values });
  }

  async takeCeremony(sessionId: string): Promise<Ceremony | null> {
    // Deleted as it is read, in one statement: two answers to one challenge cannot both find it.
    const [taken] = await this.db
      .delete(passkeyCeremonies)
      .where(eq(passkeyCeremonies.sessionId, sessionId))
      .returning();
    if (taken === undefined || taken.expiresAt.getTime() <= Date.now()) return null;
    if (taken.purpose === 'register' && taken.userId !== null) {
      return { purpose: 'register', challenge: taken.challenge, userId: taken.userId };
    }
    return taken.purpose === 'sign-in'
      ? { purpose: 'sign-in', challenge: taken.challenge, userId: null }
      : null;
  }

  async createAccount(passkey: NewPasskey): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(users).values({ id: passkey.userId });
      await tx.insert(passkeys).values({ ...passkey, transports: [...passkey.transports] });
    });
  }

  async findPasskey(id: string): Promise<StoredPasskey | null> {
    const [found] = await this.db
      .select({
        id: passkeys.id,
        userId: passkeys.userId,
        publicKey: passkeys.publicKey,
        counter: passkeys.counter,
        transports: passkeys.transports,
      })
      .from(passkeys)
      .where(eq(passkeys.id, id));
    return found ?? null;
  }

  async usedPasskey(id: string, counter: number): Promise<void> {
    await this.db
      .update(passkeys)
      // Never backwards: two sign-ins racing with one passkey keep the higher count.
      .set({ counter: sql`greatest(${passkeys.counter}, ${counter})`, lastUsedAt: sql`now()` })
      .where(eq(passkeys.id, id));
  }

  async account(userId: string): Promise<Account | null> {
    const [found] = await this.db
      .select({ id: users.id, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId));
    return found ?? null;
  }
}
