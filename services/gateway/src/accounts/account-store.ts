/** A passkey as kept: enough to check the next sign-in with it. */
export interface StoredPasskey {
  /** The credential id, base64url. */
  readonly id: string;
  readonly userId: string;
  /** The COSE public key, base64url. */
  readonly publicKey: string;
  readonly counter: number;
  readonly transports: readonly string[];
}

export interface NewPasskey extends StoredPasskey {
  /** `singleDevice` or `multiDevice`. */
  readonly deviceType: string;
  readonly backedUp: boolean;
}

/** A passkey ceremony one browser began: the challenge its device must sign. */
export type Ceremony =
  | { readonly purpose: 'register'; readonly challenge: string; readonly userId: string }
  | { readonly purpose: 'sign-in'; readonly challenge: string; readonly userId: null };

export interface Account {
  readonly id: string;
  readonly createdAt: Date;
}

/** Where accounts and their passkeys are kept; Postgres in production. */
export abstract class AccountStore {
  /** Starts a ceremony for a session, in place of any it had begun. */
  abstract beginCeremony(sessionId: string, ceremony: Ceremony, expiresAt: Date): Promise<void>;

  /**
   * The ceremony a session began, removed as it is read, so a challenge is
   * answered once; null when there is none or it ran out of time.
   */
  abstract takeCeremony(sessionId: string): Promise<Ceremony | null>;

  /** An account and its first passkey, in one step. */
  abstract createAccount(passkey: NewPasskey): Promise<void>;

  abstract findPasskey(id: string): Promise<StoredPasskey | null>;

  /** Records a sign-in: the passkey's new counter, and when it was used. */
  abstract usedPasskey(id: string, counter: number): Promise<void>;

  abstract account(userId: string): Promise<Account | null>;
}
