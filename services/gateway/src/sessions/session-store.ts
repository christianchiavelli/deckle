/** One browser's session as the gateway keeps it. */
export interface SessionRecord {
  /** The SHA-256 of the cookie's secret. */
  readonly id: string;
  /** The account signed in, or null for a guest. */
  readonly userId: string | null;
  /** Commerce's guest session, which holds the cart. */
  readonly cartToken: string | null;
  /** Commerce's session for the signed-in customer. */
  readonly customerToken: string | null;
  readonly expiresAt: Date;
}

/** What a session may change about itself between sign-ins. */
export type SessionChanges = Partial<Pick<SessionRecord, 'cartToken' | 'customerToken'>>;

/** A session's lifetime slides, but not on every request: once a while is enough. */
export interface Renewal {
  /** The new expiry. */
  readonly until: Date;
  /** Renew only a session last seen before this, so most reads write nothing. */
  readonly ifSeenBefore: Date;
}

export interface FoundSession {
  readonly session: SessionRecord;
  /** Whether this read pushed the expiry back, and so the cookie must be sent again. */
  readonly renewed: boolean;
}

/** Where sessions are kept; Postgres in production, memory in tests that are about something else. */
export abstract class SessionStore {
  /** The session, if it has not expired, renewed when it is due. */
  abstract find(id: string, renewal: Renewal): Promise<FoundSession | null>;

  abstract update(id: string, changes: SessionChanges): Promise<void>;

  /**
   * Starts a session, in place of another when there was one: a sign-in or a
   * sign-out swaps them in one step, and the old id stops opening anything the
   * moment the new one exists.
   */
  abstract replace(oldId: string | null, next: SessionRecord): Promise<void>;

  /** Removes what expired; returns how many sessions went. */
  abstract deleteExpired(): Promise<number>;
}
