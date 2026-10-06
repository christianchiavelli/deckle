import { Inject, Injectable } from '@nestjs/common';
import { and, desc, gt, isNull, lte, or, sql } from 'drizzle-orm';
import type { JWK } from 'jose';
import { DATABASE, type Database } from '../database/database.js';
import { signingKeys } from './signing-keys.table.js';

export interface StoredSigningKey {
  readonly kid: string;
  readonly algorithm: string;
  readonly publicJwk: JWK;
  readonly privateJwk: JWK;
}

/**
 * Where signing keys live. Every replica must sign with keys the others publish,
 * so they are shared through Postgres rather than kept per process.
 */
export abstract class SigningKeyStore {
  /** The key to sign with now, created with `generate` if there is none yet. */
  abstract ensureActiveKey(generate: () => Promise<StoredSigningKey>): Promise<StoredSigningKey>;

  /** Public keys a verifier may still meet: the active one, the next, and recently retired ones. */
  abstract publishedKeys(): Promise<JWK[]>;
}

/** A retired key stays published this long: well past any token it signed (60 s at most) and any JWKS cache. */
const RETIRED_KEY_GRACE = sql`interval '1 hour'`;
const KEY_CREATION_LOCK = 'deckle-gateway:signing-keys';

const isActive = and(
  lte(signingKeys.notBefore, sql`now()`),
  or(isNull(signingKeys.notAfter), gt(signingKeys.notAfter, sql`now()`)),
);

@Injectable()
export class PgSigningKeyStore extends SigningKeyStore {
  constructor(@Inject(DATABASE) private readonly db: Database) {
    super();
  }

  /**
   * Two replicas starting on an empty table would each create a key, and each
   * sign with its own. A transaction-scoped advisory lock serialises the check:
   * the second replica waits, then finds the first one's key.
   */
  ensureActiveKey(generate: () => Promise<StoredSigningKey>): Promise<StoredSigningKey> {
    return this.db.transaction(async (transaction) => {
      await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${KEY_CREATION_LOCK}))`);
      const [active] = await transaction
        .select()
        .from(signingKeys)
        .where(isActive)
        .orderBy(desc(signingKeys.notBefore))
        .limit(1);
      if (active !== undefined) return active;

      const key = await generate();
      const [created] = await transaction.insert(signingKeys).values(key).returning();
      if (created === undefined) throw new Error('The new signing key was not stored');
      return created;
    });
  }

  async publishedKeys(): Promise<JWK[]> {
    const rows = await this.db
      .select({ publicJwk: signingKeys.publicJwk })
      .from(signingKeys)
      .where(
        or(
          isNull(signingKeys.notAfter),
          gt(signingKeys.notAfter, sql`now() - ${RETIRED_KEY_GRACE}`),
        ),
      )
      .orderBy(desc(signingKeys.notBefore));
    return rows.map((row) => row.publicJwk);
  }
}
