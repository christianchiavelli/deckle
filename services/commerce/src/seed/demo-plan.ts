import type { PaperSize } from '@deckle/print-sizes';
import { CITIES, PEOPLE } from './demo-people.js';

/**
 * The shop's demo trade: guest customers, and the orders they placed over the past
 * weeks. Drawn from a fixed seed back from the end of the day, so every stack gets the
 * same people buying the same prints at the same hours, on the same days before its
 * own today. Pure: `seed-demo.ts` places each order through Vendure's services, the
 * way a checkout does.
 */

/** A size of a work that can be bought. */
export interface SellableVariant {
  readonly sku: string;
  /** The product it belongs to: an order never holds two sizes of one work. */
  readonly work: string;
  readonly size: PaperSize;
}

export interface DemoAddress {
  readonly streetLine1: string;
  readonly city: string;
  readonly province: string | null;
  readonly postalCode: string;
  readonly countryCode: string;
}

export interface DemoCustomer {
  readonly firstName: string;
  readonly lastName: string;
  readonly emailAddress: string;
  readonly address: DemoAddress;
}

/** Where an order stands now: shipped and delivered follow from its dates. */
export type DemoFate = 'awaiting-shipment' | 'shipped' | 'delivered' | 'cancelled';

export interface DemoOrder {
  /** An index into the plan's customers. */
  readonly customer: number;
  readonly placedAt: Date;
  readonly lines: readonly { readonly sku: string; readonly quantity: number }[];
  readonly fate: DemoFate;
  /** Set once the order has left, for the shipped and the delivered. */
  readonly shippedAt: Date | null;
  readonly deliveredAt: Date | null;
  readonly cancelledAt: Date | null;
}

export interface DemoPlan {
  /** Everyone who may buy; some have yet to by now. */
  readonly customers: readonly DemoCustomer[];
  /** The orders placed by now, oldest first. */
  readonly orders: readonly DemoOrder[];
}

export interface DemoOptions {
  readonly customers: number;
  /** How many orders the plan draws, those still to come later today included. */
  readonly orders: number;
  /** How many days before the end of today the first order may go. */
  readonly days: number;
  /** The moment the plan stops at: what comes later today is left out. */
  readonly now: Date;
  /** Works that sell more often than the rest, by product. */
  readonly favourites?: readonly string[];
  readonly seed?: number;
}

/** How often each size sells, of those a work offers. */
const SIZE_WEIGHTS: Readonly<Record<PaperSize, number>> = { A4: 30, A3: 38, A2: 24, A1: 8 };

/** How many works an order holds: mostly one. */
const LINE_COUNTS = [
  { lines: 1, weight: 70 },
  { lines: 2, weight: 22 },
  { lines: 3, weight: 8 },
] as const;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** A small seeded generator (mulberry32): the same seed, the same numbers. */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** One item, more likely the heavier it weighs. */
function pick<T>(next: () => number, items: readonly T[], weight: (item: T) => number): T {
  let left = next() * items.reduce((sum, item) => sum + weight(item), 0);
  let chosen: T | undefined;
  for (const item of items) {
    // Rounding can leave a sliver after the last item; the loop ends on it then.
    chosen = item;
    left -= weight(item);
    if (left < 0) {
      break;
    }
  }
  if (chosen === undefined) {
    throw new Error('Nothing to pick from');
  }
  return chosen;
}

const between = (next: () => number, low: number, high: number) => low + next() * (high - low);

/** A moment on the day of `day`, between two hours of it in UTC. */
const duringHours = (next: () => number, day: number, from: number, to: number) =>
  Math.floor(day / DAY) * DAY + between(next, from * HOUR, to * HOUR);

/** An address at a domain reserved for examples, so no mail can reach anyone. */
export function emailOf(person: { firstName: string; lastName: string }): string {
  const local = `${person.firstName} ${person.lastName}`
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '.');
  return `${local}@example.com`;
}

/**
 * How busy a moment was, from 0 to 1.2: the shop grows over the period and sells
 * little at night, in UTC, which is near enough for a demo. No busier weekends: the
 * day of the week would make the plan differ from one day to the next.
 */
function busyness(at: number, end: number, days: number): number {
  const growth = 0.45 + 0.55 * (1 - (end - at) / (days * DAY));
  const hour = new Date(at).getUTCHours();
  const daytime = hour < 7 ? 0.15 : hour < 12 ? 0.8 : hour < 18 ? 1 : hour < 23 ? 1.2 : 0.5;
  return growth * daytime;
}

const BUSIEST = 1.2;

export function demoPlan(variants: readonly SellableVariant[], options: DemoOptions): DemoPlan {
  if (options.customers < 1 || options.customers > PEOPLE.length) {
    throw new Error(`The demo has 1 to ${String(PEOPLE.length)} customers to offer`);
  }
  if (variants.length === 0) {
    throw new Error('The demo needs something to sell, and the catalogue is empty');
  }
  const next = generator(options.seed ?? 20_261_006);
  const now = options.now.getTime();
  // Drawn back from the next midnight in UTC, the plan is the same on any day, moved by
  // whole days; a later run finds the orders an earlier one placed at its start.
  const end = (Math.floor(now / DAY) + 1) * DAY;
  const favourites = new Set(options.favourites ?? []);

  const customers = PEOPLE.slice(0, options.customers).map(
    ({ city: key, ...person }): DemoCustomer => {
      const city = CITIES[key];
      return {
        ...person,
        emailAddress: emailOf(person),
        address: {
          streetLine1: `${String(Math.floor(between(next, 2, 240)))} ${city.street}`,
          city: city.city,
          province: city.province,
          postalCode: city.postalCode,
          countryCode: city.countryCode,
        },
      };
    },
  );

  // Sorted, so the plan is the same whatever order the database lists the variants in.
  const offered = [...variants].sort((a, b) => a.sku.localeCompare(b.sku));
  const works = [...new Set(offered.map((variant) => variant.work))].sort();
  const sizesOf = (work: string) => offered.filter((variant) => variant.work === work);
  const indexes = customers.map((_, index) => index);

  const orders: DemoOrder[] = [];
  while (orders.length < options.orders) {
    // A moment in the period, kept as often as the shop was busy then.
    const at = end - between(next, 10 * 60_000, options.days * DAY);
    if (next() * BUSIEST > busyness(at, end, options.days)) {
      continue;
    }
    // A long tail: the first customers come back often, most buy once or twice.
    const customer = pick(next, indexes, (index) => 1 / (index + 1) ** 0.7);
    const count = Math.min(pick(next, LINE_COUNTS, (option) => option.weight).lines, works.length);
    const chosen = new Set<string>();
    while (chosen.size < count) {
      chosen.add(pick(next, works, (work) => (favourites.has(work) ? 3 : 1)));
    }
    const lines = [...chosen].map((work) => ({
      sku: pick(next, sizesOf(work), (variant) => SIZE_WEIGHTS[variant.size]).sku,
      quantity: next() < 0.92 ? 1 : 2,
    }));

    const cancelled = next() < 0.05;
    // Parcels leave in the shop's working hours and arrive by day: at least 21 hours
    // after payment, later than any cancellation, and over two days on the road.
    const shippedAt = duringHours(next, at + between(next, 1.5 * DAY, 3 * DAY), 9, 17);
    const deliveredAt = duringHours(next, shippedAt + between(next, 3 * DAY, 8 * DAY), 9, 19);
    const cancelledAt = at + between(next, 3 * HOUR, 20 * HOUR);
    const fate: DemoFate =
      cancelled && cancelledAt < now
        ? 'cancelled'
        : shippedAt > now
          ? 'awaiting-shipment'
          : deliveredAt > now
            ? 'shipped'
            : 'delivered';
    orders.push({
      customer,
      placedAt: new Date(at),
      lines,
      fate,
      shippedAt: fate === 'shipped' || fate === 'delivered' ? new Date(shippedAt) : null,
      deliveredAt: fate === 'delivered' ? new Date(deliveredAt) : null,
      cancelledAt: fate === 'cancelled' ? new Date(cancelledAt) : null,
    });
  }
  orders.sort((a, b) => a.placedAt.getTime() - b.placedAt.getTime());
  return { customers, orders: orders.filter((order) => order.placedAt.getTime() <= now) };
}

const MINUTE = 60_000;

/** One step of an order's history, as Vendure records it: a type, and the state it led to. */
export interface HistoryStep {
  readonly type: string;
  readonly to?: unknown;
}

/**
 * When a step of an order's history happened by the plan's dates. Vendure stamps each
 * step with the moment the seed took it, all within seconds; this spreads them over
 * the order's life: a cart started minutes before it was paid, a parcel packed two
 * hours before it went out, a refund an hour after the cancellation.
 */
export function momentOf(order: DemoOrder, step: HistoryStep): Date {
  const placed = order.placedAt.getTime();
  const shipped = order.shippedAt?.getTime() ?? placed;
  const cancelled = order.cancelledAt?.getTime() ?? placed;
  if (step.type === 'ORDER_CANCELLATION' || step.to === 'Cancelled') {
    return new Date(cancelled);
  }
  if (step.type === 'ORDER_REFUND_TRANSITION') {
    return new Date(cancelled + HOUR);
  }
  if (step.type === 'ORDER_FULFILLMENT' || step.to === 'Pending') {
    return new Date(shipped - 2 * HOUR);
  }
  if (step.to === 'Shipped' || step.to === 'PartiallyShipped') {
    return new Date(shipped);
  }
  if (step.to === 'Delivered' || step.to === 'PartiallyDelivered') {
    return order.deliveredAt ?? new Date(shipped);
  }
  if (step.to === 'AddingItems') {
    return new Date(placed - 8 * MINUTE);
  }
  if (step.to === 'ArrangingPayment') {
    return new Date(placed - 2 * MINUTE);
  }
  return order.placedAt;
}
