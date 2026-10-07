import {
  type Account,
  AccountStore,
  type Ceremony,
  type NewPasskey,
  type StoredPasskey,
} from '../../src/accounts/account-store.js';
import type { DropEvents } from '../../src/drops/drop-events.js';
import {
  type ClaimOutcome,
  type CopyStatus,
  type DropRecord,
  type DropStock,
  DropStore,
  type OwnedCopy,
  type SaleOutcome,
} from '../../src/drops/drop-store.js';
import {
  type FoundSession,
  type Renewal,
  type SessionChanges,
  type SessionRecord,
  SessionStore,
} from '../../src/sessions/session-store.js';

/**
 * Stand-ins for the sessions, accounts and drops kept in Postgres, for tests
 * about the API around them. What only the database can promise, such as two
 * claims racing for one copy, is tested against Postgres in the integration suite.
 */

export class InMemorySessionStore extends SessionStore {
  readonly sessions = new Map<string, SessionRecord & { seenAt: Date }>();

  find(id: string, renewal: Renewal): Promise<FoundSession | null> {
    const found = this.sessions.get(id);
    if (found === undefined || found.expiresAt.getTime() <= Date.now())
      return Promise.resolve(null);
    const renewed = found.seenAt.getTime() < renewal.ifSeenBefore.getTime();
    if (renewed) {
      this.sessions.set(id, { ...found, seenAt: new Date(), expiresAt: renewal.until });
    }
    const current = this.sessions.get(id) ?? found;
    const session: SessionRecord = {
      id: current.id,
      userId: current.userId,
      cartToken: current.cartToken,
      customerToken: current.customerToken,
      expiresAt: current.expiresAt,
    };
    return Promise.resolve({ session, renewed });
  }

  update(id: string, changes: SessionChanges): Promise<void> {
    const found = this.sessions.get(id);
    if (found !== undefined) this.sessions.set(id, { ...found, ...changes });
    return Promise.resolve();
  }

  replace(oldId: string | null, next: SessionRecord): Promise<void> {
    if (oldId !== null) this.sessions.delete(oldId);
    this.sessions.set(next.id, { ...next, seenAt: new Date() });
    return Promise.resolve();
  }

  deleteExpired(): Promise<number> {
    let deleted = 0;
    for (const [id, session] of this.sessions) {
      if (session.expiresAt.getTime() <= Date.now()) {
        this.sessions.delete(id);
        deleted++;
      }
    }
    return Promise.resolve(deleted);
  }
}

export class InMemoryAccountStore extends AccountStore {
  readonly ceremonies = new Map<string, { ceremony: Ceremony; expiresAt: Date }>();
  readonly accounts = new Map<string, Account>();
  readonly passkeys = new Map<string, NewPasskey & { lastUsedAt: Date | null }>();

  beginCeremony(sessionId: string, ceremony: Ceremony, expiresAt: Date): Promise<void> {
    this.ceremonies.set(sessionId, { ceremony, expiresAt });
    return Promise.resolve();
  }

  takeCeremony(sessionId: string): Promise<Ceremony | null> {
    const found = this.ceremonies.get(sessionId);
    this.ceremonies.delete(sessionId);
    if (found === undefined || found.expiresAt.getTime() <= Date.now())
      return Promise.resolve(null);
    return Promise.resolve(found.ceremony);
  }

  createAccount(passkey: NewPasskey): Promise<void> {
    this.accounts.set(passkey.userId, { id: passkey.userId, createdAt: new Date() });
    this.passkeys.set(passkey.id, { ...passkey, lastUsedAt: null });
    return Promise.resolve();
  }

  findPasskey(id: string): Promise<StoredPasskey | null> {
    const found = this.passkeys.get(id);
    return Promise.resolve(
      found === undefined
        ? null
        : {
            id: found.id,
            userId: found.userId,
            publicKey: found.publicKey,
            counter: found.counter,
            transports: found.transports,
          },
    );
  }

  usedPasskey(id: string, counter: number): Promise<void> {
    const found = this.passkeys.get(id);
    if (found !== undefined) {
      this.passkeys.set(id, {
        ...found,
        counter: Math.max(found.counter, counter),
        lastUsedAt: new Date(),
      });
    }
    return Promise.resolve();
  }

  account(userId: string): Promise<Account | null> {
    return Promise.resolve(this.accounts.get(userId) ?? null);
  }
}

interface MemoryCopy {
  status: CopyStatus;
  holderId: string | null;
  heldUntil: Date | null;
  orderCode: string | null;
  claimedAt: Date | null;
}

/** One process, one thread: the rules hold here because nothing interleaves inside a call. */
export class InMemoryDropStore extends DropStore {
  readonly records = new Map<string, DropRecord>();
  readonly copies = new Map<string, MemoryCopy[]>();
  private readonly paying = new Set<string>();

  constructor(private readonly events: DropEvents) {
    super();
  }

  record(drops: readonly DropRecord[]): Promise<readonly string[]> {
    const recorded: string[] = [];
    for (const drop of drops) {
      if (this.records.has(drop.slug)) continue;
      this.records.set(drop.slug, drop);
      this.copies.set(
        drop.slug,
        Array.from({ length: drop.editionSize }, () => ({
          status: 'open',
          holderId: null,
          heldUntil: null,
          orderCode: null,
          claimedAt: null,
        })),
      );
      recorded.push(drop.slug);
    }
    return Promise.resolve(recorded);
  }

  drops(): Promise<readonly DropRecord[]> {
    return Promise.resolve(
      [...this.records.values()].sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime()),
    );
  }

  drop(slug: string): Promise<DropRecord | null> {
    return Promise.resolve(this.records.get(slug) ?? null);
  }

  stock(slugs: readonly string[]): Promise<ReadonlyMap<string, DropStock>> {
    const stock = new Map<string, DropStock>();
    for (const slug of slugs) {
      const copies = this.copies.get(slug);
      if (copies === undefined) continue;
      const statuses = copies.map((copy) => (lapsed(copy) ? 'open' : copy.status));
      stock.set(slug, {
        open: statuses.filter((status) => status === 'open').length,
        held: statuses.filter((status) => status === 'held').length,
        sold: statuses.filter((status) => status === 'sold').length,
        copies: statuses,
      });
    }
    return Promise.resolve(stock);
  }

  async claim(slug: string, userId: string, holdMinutes: number): Promise<ClaimOutcome> {
    const drop = this.records.get(slug);
    if (drop === undefined) return { kind: 'no-drop' };
    if (drop.opensAt.getTime() > Date.now()) return { kind: 'not-open' };
    for (const [other, copies] of this.copies) {
      for (const copy of copies) {
        if (copy.holderId === userId && lapsed(copy)) {
          open(copy);
          if (other !== slug) await this.events.changed(other);
        }
      }
    }
    const theirs = [...this.copies].flatMap(([dropSlug, copies]) =>
      copies.filter((copy) => copy.holderId === userId).map((copy) => ({ dropSlug, copy })),
    );
    if (theirs.some((entry) => entry.dropSlug === slug)) return { kind: 'already-has' };
    if (theirs.some((entry) => entry.copy.status === 'held')) return { kind: 'holding-another' };
    const copies = this.copies.get(slug) ?? [];
    const index = copies.findIndex((copy) => copy.status === 'open' || lapsed(copy));
    const copy = copies[index];
    if (copy === undefined) return { kind: 'no-copy' };
    Object.assign(copy, {
      status: 'held',
      holderId: userId,
      heldUntil: new Date(Date.now() + holdMinutes * 60_000),
      orderCode: null,
      claimedAt: new Date(),
    });
    await this.events.changed(slug);
    return { kind: 'held', copy: owned(slug, index, copy) };
  }

  async release(slug: string, userId: string): Promise<boolean> {
    const copy = this.copies
      .get(slug)
      ?.find((each) => each.holderId === userId && each.status === 'held');
    if (copy === undefined) return false;
    open(copy);
    await this.events.changed(slug);
    return true;
  }

  copiesOf(userId: string): Promise<readonly OwnedCopy[]> {
    return Promise.resolve(
      [...this.copies].flatMap(([slug, copies]) =>
        copies.flatMap((copy, index) =>
          copy.holderId === userId && !lapsed(copy) ? [owned(slug, index, copy)] : [],
        ),
      ),
    );
  }

  async sell(
    slug: string,
    userId: string,
    pay: (copy: OwnedCopy) => Promise<string>,
  ): Promise<SaleOutcome> {
    const copies = this.copies.get(slug) ?? [];
    const index = copies.findIndex((copy) => copy.holderId === userId && copy.status === 'held');
    const copy = copies[index];
    if (copy === undefined) return { kind: 'no-hold' };
    // As in Postgres: a payment under way wins over the clock, then a lapsed hold is gone.
    const key = `${slug}#${String(index)}`;
    if (this.paying.has(key)) return { kind: 'in-progress' };
    if (lapsed(copy)) return { kind: 'no-hold' };
    this.paying.add(key);
    try {
      const orderCode = await pay(owned(slug, index, copy));
      Object.assign(copy, { status: 'sold', heldUntil: null, orderCode });
      await this.events.changed(slug);
      return { kind: 'sold', copy: owned(slug, index, copy) };
    } finally {
      this.paying.delete(key);
    }
  }

  async releaseExpired(): Promise<readonly string[]> {
    const changed: string[] = [];
    for (const [slug, copies] of this.copies) {
      const lapsedCopies = copies.filter(
        (copy, index) => lapsed(copy) && !this.paying.has(`${slug}#${String(index)}`),
      );
      for (const copy of lapsedCopies) open(copy);
      if (lapsedCopies.length > 0) {
        changed.push(slug);
        await this.events.changed(slug);
      }
    }
    return changed;
  }

  /** Moves a hold's deadline, as if its ten minutes had passed. */
  expire(slug: string, userId: string): void {
    const copy = this.copies.get(slug)?.find((each) => each.holderId === userId);
    if (copy?.status === 'held') copy.heldUntil = new Date(Date.now() - 1000);
  }
}

const lapsed = (copy: MemoryCopy) =>
  copy.status === 'held' && copy.heldUntil !== null && copy.heldUntil.getTime() <= Date.now();

function open(copy: MemoryCopy) {
  Object.assign(copy, {
    status: 'open',
    holderId: null,
    heldUntil: null,
    orderCode: null,
    claimedAt: null,
  });
}

function owned(slug: string, index: number, copy: MemoryCopy): OwnedCopy {
  const held = copy.status === 'held';
  return {
    drop: slug,
    number: index + 1,
    status: held ? 'held' : 'sold',
    heldUntil: held ? copy.heldUntil : null,
    secondsLeft:
      held && copy.heldUntil !== null
        ? Math.max(Math.ceil((copy.heldUntil.getTime() - Date.now()) / 1000), 0)
        : null,
    orderCode: copy.orderCode,
  };
}
