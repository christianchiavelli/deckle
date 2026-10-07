import type { PaperSize } from '@deckle/print-sizes';

/**
 * A numbered drop, as the stack opens with it. The gateway hands out its copies,
 * commerce sells each as the one variant of an edition product whose stock is
 * the edition's size, and the CMS holds the words on its page. Each service seeds
 * its own part from these lines, so the three agree on how many copies there are
 * and what they cost.
 */
export interface DropDefinition {
  /** The drop's address in the store, its page's slug in the CMS and its edition's in commerce. */
  readonly slug: string;
  /** The work the drop prints. */
  readonly artworkSlug: string;
  readonly paperSize: PaperSize;
  /** How many numbered copies there are: the gateway's rows, and commerce's stock. */
  readonly editionSize: number;
  /** In USD cents, taxes included, as commerce prices everything. */
  readonly price: number;
  /**
   * Days between the gateway first recording the drop and its opening, at
   * 18:00 UTC; none opens it at once. A fresh clone has one drop open and one
   * to come.
   */
  readonly opensAfterDays: number;
}

/** The hour a drop that waits opens at: early evening in Europe, midday in the Americas. */
export const OPENING_HOUR_UTC = 18;

export const DROPS = [
  {
    slug: 'melencolia-i-numbered',
    artworkSlug: 'melencolia-i',
    paperSize: 'A3',
    editionSize: 50,
    price: 18_000,
    opensAfterDays: 0,
  },
  {
    slug: 'the-great-wave-numbered',
    artworkSlug: 'under-the-wave-off-kanagawa',
    paperSize: 'A3',
    editionSize: 50,
    price: 18_000,
    opensAfterDays: 8,
  },
] as const satisfies readonly DropDefinition[];

/** When a drop opens, given the moment the gateway first recorded it. */
export function opensAt(drop: Pick<DropDefinition, 'opensAfterDays'>, recordedAt: Date): Date {
  if (drop.opensAfterDays === 0) {
    return recordedAt;
  }
  return new Date(
    Date.UTC(
      recordedAt.getUTCFullYear(),
      recordedAt.getUTCMonth(),
      recordedAt.getUTCDate() + drop.opensAfterDays,
      OPENING_HOUR_UTC,
    ),
  );
}
