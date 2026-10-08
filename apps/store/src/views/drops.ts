import { formatCentimetres, formatMoney, formatPpi, MISSING } from '@deckle/ui/format';
import type { Copy } from '../copy';
import type { CopyState, DropSummaryFragment } from '../gateway/generated';
import { dayOf, daysUntil, timeOf } from './time';

/** A drop as the server reads it, with its words and its print. */
export type DropSummary = DropSummaryFragment;

/** Where a drop's copies stand, as the gateway counts them. */
export interface Stock {
  readonly open: number;
  readonly held: number;
  readonly sold: number;
  /** Each copy, copy 1 first. */
  readonly copies: readonly CopyState[];
}

/** The stocks the gateway lists, by drop. */
export function stocksBySlug(
  drops: readonly { readonly slug: string; readonly stock: Stock }[],
): Map<string, Stock> {
  return new Map(drops.map((drop) => [drop.slug, drop.stock]));
}

/** Before its hour, or open: a drop never closes, its copies run out. */
export type Phase = 'soon' | 'open';

export function phaseOf(drop: Pick<DropSummary, 'opensAt'>, now: number): Phase {
  return Date.parse(drop.opensAt) > now ? 'soon' : 'open';
}

/** No copy left to claim, nor any held that could come back. */
export function allClaimed(stock: Stock): boolean {
  return stock.open === 0 && stock.held === 0;
}

/** How a copy shows in the grid, when it is not open: the design system's words for it. */
export type CopyMark = 'held' | 'claimed' | 'yours';

/**
 * The copies that are not open, by number: held while someone pays, claimed
 * once paid, and the reader's own whichever it is.
 */
export function marksOf(stock: Stock, yours: number | null): Record<number, CopyMark> {
  const marks: Record<number, CopyMark> = {};
  stock.copies.forEach((state, index) => {
    if (state !== 'OPEN') {
      marks[index + 1] = state === 'HELD' ? 'held' : 'claimed';
    }
  });
  if (yours !== null) {
    marks[yours] = 'yours';
  }
  return marks;
}

/** The figures under a drop that is open: how many are open, held and claimed. */
export function tallyOf(stock: Stock, copy: Copy) {
  return [
    { value: String(stock.open), unit: copy.drops.tally.open },
    { value: String(stock.held), unit: copy.drops.tally.held },
    { value: String(stock.sold), unit: copy.drops.tally.claimed },
  ];
}

/** The grid's caption and name, with the count. */
export function standingOf(stock: Stock, size: number, copy: Copy) {
  return {
    caption:
      stock.held === 0 && stock.sold === 0
        ? copy.drops.noneClaimed(size)
        : copy.drops.standing(size, stock.sold, stock.held, stock.open),
    label: copy.drops.copiesLabel(size, stock.open),
  };
}

/** The editor's headline, or one made from the work's title until there is one. */
export function headlineOf(
  drop: Pick<DropSummary, 'page' | 'artwork' | 'slug' | 'editionSize'>,
  copy: Copy,
): string {
  return (
    drop.page?.headline ?? copy.drops.headline(drop.artwork?.title ?? drop.slug, drop.editionSize)
  );
}

/** The editor's words on the drop, as plain paragraphs. */
export function paragraphsOf(drop: Pick<DropSummary, 'page'>): string[] {
  return (drop.page?.blocks ?? []).flatMap((block) =>
    block.__typename === 'ParagraphBlock' ? [block.text.map((run) => run.text).join('')] : [],
  );
}

/** "$180", or a dash while commerce sells no edition of it. */
export function priceOf(drop: Pick<DropSummary, 'price'>, copy: Copy): string {
  return formatMoney(drop.price?.amount ?? null, drop.price?.currencyCode ?? 'USD', copy.locale);
}

/** "Thu 15 Oct, 18:00 UTC". */
export function openingOf(drop: Pick<DropSummary, 'opensAt'>, copy: Copy): string {
  return copy.drops.at(dayOf(drop.opensAt, copy), timeOf(drop.opensAt, copy));
}

/** The chip on a drop: open, or when it opens, or that every copy is gone. */
export function chipOf(
  drop: Pick<DropSummary, 'opensAt'>,
  stock: Stock | null,
  now: number,
  copy: Copy,
): { label: string; tone: 'accent' | 'soft' } {
  if (phaseOf(drop, now) === 'soon') {
    return { label: copy.drops.opens(dayOf(drop.opensAt, copy)), tone: 'soft' };
  }
  return stock !== null && allClaimed(stock)
    ? { label: copy.drops.allClaimed, tone: 'soft' }
    : { label: copy.drops.openNow, tone: 'accent' };
}

/** When it opens or how many are open, what a copy costs, and the one-per-person rule. */
export function factsOf(
  drop: Pick<DropSummary, 'opensAt' | 'price' | 'editionSize'>,
  stock: Stock | null,
  now: number,
  copy: Copy,
) {
  const first =
    phaseOf(drop, now) === 'soon'
      ? { term: copy.drops.opensTerm, detail: openingOf(drop, copy) }
      : {
          term: copy.drops.open,
          detail: stock === null ? MISSING : copy.drops.openOf(stock.open, drop.editionSize),
        };
  return [
    first,
    { term: copy.drops.price, detail: priceOf(drop, copy) },
    { term: copy.drops.limit, detail: copy.drops.onePerPerson },
  ];
}

/** "Opens in 3 days", "Opens tomorrow": the chip on a drop's own page before it opens. */
export function soonChipOf(drop: Pick<DropSummary, 'opensAt'>, now: number, copy: Copy): string {
  return copy.drop.soon(daysUntil(drop.opensAt, now));
}

/**
 * The drop worth a line above every page: one that is open with copies left,
 * else the next to open. None when every drop has run out.
 */
export function featuredDrop<T extends Pick<DropSummary, 'slug' | 'opensAt'>>(
  drops: readonly T[],
  stocks: ReadonlyMap<string, Stock>,
  now: number,
): T | null {
  const open = drops.find((drop) => {
    const stock = stocks.get(drop.slug);
    return phaseOf(drop, now) === 'open' && stock !== undefined && !allClaimed(stock);
  });
  if (open) {
    return open;
  }
  const soon = drops
    .filter((drop) => phaseOf(drop, now) === 'soon')
    .sort((a, b) => Date.parse(a.opensAt) - Date.parse(b.opensAt));
  return soon[0] ?? null;
}

/** The line above the header about that drop. */
export function announcementOf(
  drop: Pick<DropSummary, 'opensAt' | 'artwork' | 'slug'>,
  now: number,
  copy: Copy,
): { text: string; link: string } {
  const title = drop.artwork?.title ?? drop.slug;
  return phaseOf(drop, now) === 'soon'
    ? {
        text: copy.drops.announceSoon(title, dayOf(drop.opensAt, copy), timeOf(drop.opensAt, copy)),
        link: copy.drops.see,
      }
    : { text: copy.drops.announceOpen(title), link: copy.drops.claim };
}

/** The pointer from a work's own page to its numbered edition. */
export function calloutOf(
  drop: Pick<DropSummary, 'opensAt' | 'editionSize'>,
  now: number,
  copy: Copy,
): { title: string; detail: string } {
  return {
    title: copy.drops.callout(drop.editionSize),
    detail:
      phaseOf(drop, now) === 'soon'
        ? copy.drops.calloutSoon(dayOf(drop.opensAt, copy), timeOf(drop.opensAt, copy))
        : copy.drops.calloutOpen,
  };
}

/** What the drop's page records of the print: its paper, resolution, edition and price. */
export function recordOf(drop: DropSummary, copy: Copy) {
  const option = drop.artwork?.sizes.find((size) => size.size === drop.paperSize) ?? null;
  const image = drop.artwork?.image ?? null;
  const pixels = new Intl.NumberFormat(copy.locale);
  const { record } = copy.drop;
  return [
    {
      term: record.size,
      detail:
        option === null
          ? null
          : copy.drop.sizeOf(option.size, formatCentimetres(option.paper, copy.locale)),
    },
    {
      term: record.resolution,
      detail:
        option === null || image === null
          ? null
          : copy.drop.resolutionOf(
              formatPpi(option.ppi, copy.locale),
              pixels.format(image.scanWidth),
              pixels.format(image.scanHeight),
            ),
    },
    { term: record.paper, detail: copy.drop.paper },
    { term: record.edition, detail: copy.drop.editionOf(drop.editionSize) },
    { term: record.price, detail: drop.price === null ? null : priceOf(drop, copy) },
    { term: record.limit, detail: copy.drops.onePerPerson },
  ];
}
