/** A drop as the gateway records it. */
export interface DropRecord {
  readonly slug: string;
  readonly artworkSlug: string;
  readonly editionSize: number;
  readonly opensAt: Date;
}

export type CopyStatus = 'open' | 'held' | 'sold';

/**
 * Where a drop's copies stand, by the database's clock: a hold that has run
 * out counts as open, whether or not the sweeper has been by.
 */
export interface DropStock {
  readonly open: number;
  readonly held: number;
  readonly sold: number;
  /** Each copy's status, copy 1 first. */
  readonly copies: readonly CopyStatus[];
}

/** A copy that belongs to someone: held for them, or theirs for good. */
export interface OwnedCopy {
  readonly drop: string;
  readonly number: number;
  readonly status: 'held' | 'sold';
  /** When a hold runs out; null once sold. */
  readonly heldUntil: Date | null;
  /** Whole seconds left on a hold by the database's clock, so a browser's clock cannot skew it. */
  readonly secondsLeft: number | null;
  readonly orderCode: string | null;
}

export type ClaimOutcome =
  | { readonly kind: 'held'; readonly copy: OwnedCopy }
  | { readonly kind: 'no-drop' }
  | { readonly kind: 'not-open' }
  | { readonly kind: 'no-copy' }
  | { readonly kind: 'already-has' }
  | { readonly kind: 'holding-another' };

export type SaleOutcome =
  | { readonly kind: 'sold'; readonly copy: OwnedCopy }
  | { readonly kind: 'no-hold' }
  | { readonly kind: 'in-progress' };

/**
 * Drops and their numbered copies. Every rule that keeps a drop fair is the
 * database's, in Postgres: a row per copy, a lock per claim, an index per
 * person. Memory stands in only for tests about something else.
 */
export abstract class DropStore {
  /**
   * Records the drops not recorded yet, each with its copies. A drop already
   * recorded is left as it is, so its opening time and its sales stand.
   */
  abstract record(drops: readonly DropRecord[]): Promise<readonly string[]>;

  abstract drops(): Promise<readonly DropRecord[]>;

  abstract drop(slug: string): Promise<DropRecord | null>;

  abstract stock(slugs: readonly string[]): Promise<ReadonlyMap<string, DropStock>>;

  /** The lowest open copy, held for `holdMinutes` for this person, if the rules allow. */
  abstract claim(slug: string, userId: string, holdMinutes: number): Promise<ClaimOutcome>;

  /** Gives back a copy this person holds; false when they held none. */
  abstract release(slug: string, userId: string): Promise<boolean>;

  /** The copies this person holds or has bought, a hold that ran out left out. */
  abstract copiesOf(userId: string): Promise<readonly OwnedCopy[]>;

  /**
   * Sells this person the copy they hold. The copy stays locked while `pay`
   * runs, so neither the sweeper nor a second payment can touch it, and is
   * recorded as sold, with the order `pay` returns, only if `pay` succeeds.
   */
  abstract sell(
    slug: string,
    userId: string,
    pay: (copy: OwnedCopy) => Promise<string>,
  ): Promise<SaleOutcome>;

  /** Opens again the copies whose holds ran out; returns the drops that changed. */
  abstract releaseExpired(): Promise<readonly string[]>;
}
