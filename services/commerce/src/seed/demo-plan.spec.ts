import { describe, expect, it } from 'vitest';
import {
  demoPlan,
  emailOf,
  momentOf,
  type DemoOptions,
  type DemoOrder,
  type DemoPlan,
  type SellableVariant,
} from './demo-plan.js';
import { COUNTRIES } from './shop-setup.js';

const now = new Date('2026-10-06T15:00:00Z');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Six works, the last two in fewer sizes, as scans too small for the large sheets are. */
const variants: SellableVariant[] = ['a', 'b', 'c', 'd', 'e', 'f'].flatMap((work, index) =>
  (index < 4 ? (['A4', 'A3', 'A2', 'A1'] as const) : (['A4', 'A3'] as const)).map((size) => ({
    sku: `${work}-${size}`,
    work,
    size,
  })),
);

const options: DemoOptions = { customers: 12, orders: 120, days: 60, now };

describe('demoPlan', () => {
  const plan = demoPlan(variants, options);

  it('draws the same plan from the same seed, in whatever order the variants come', () => {
    expect(demoPlan([...variants].reverse(), options)).toEqual(plan);
    expect(demoPlan(variants, { ...options, seed: 7 })).not.toEqual(plan);
  });

  it('draws the same orders on another day, moved by whole days', () => {
    const drawn = ({ orders }: DemoPlan, days: number) =>
      orders.map(({ customer, lines, placedAt }) => ({
        customer,
        lines,
        placedAt: placedAt.getTime() - days * DAY,
      }));
    const later = demoPlan(variants, { ...options, now: new Date(now.getTime() + 3 * DAY) });
    expect(later.customers).toEqual(plan.customers);
    expect(drawn(later, 3)).toEqual(drawn(plan, 0));
  });

  it('leaves out what is still to come today, and adds it as the day goes on', () => {
    // Busier than the other plans here, so that today has orders to leave out.
    const busy = { ...options, orders: 600 };
    const placed = ({ orders }: DemoPlan) => orders.map((order) => order.placedAt.getTime());
    const tonight = demoPlan(variants, { ...busy, now: new Date('2026-10-06T23:59:59Z') });
    for (const hour of [0, 6, 12, 15, 18]) {
      const at = Date.UTC(2026, 9, 6, hour);
      const earlier = demoPlan(variants, { ...busy, now: new Date(at) });
      expect(placed(earlier)).toEqual(placed(tonight).filter((time) => time <= at));
    }
    const midnight = demoPlan(variants, { ...busy, now: new Date('2026-10-06T00:00:00Z') });
    expect(tonight.orders.length).toBeGreaterThan(midnight.orders.length);
  });

  it('places every order inside the period, oldest first, and more of them lately', () => {
    expect(plan.orders.length).toBeGreaterThan(110);
    expect(plan.orders.length).toBeLessThanOrEqual(120);
    const times = plan.orders.map((order) => order.placedAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    for (const time of times) {
      expect(time).toBeGreaterThan(now.getTime() - 60 * DAY);
      expect(time).toBeLessThanOrEqual(now.getTime());
    }
    const firstThird = times.filter((time) => time < now.getTime() - 40 * DAY).length;
    const lastThird = times.filter((time) => time >= now.getTime() - 20 * DAY).length;
    expect(lastThird).toBeGreaterThan(firstThird);
  });

  it('sells only the sizes on offer, one size of a work per order', () => {
    const work = new Map(variants.map((variant) => [variant.sku, variant.work]));
    for (const order of plan.orders) {
      expect(order.lines.length).toBeGreaterThanOrEqual(1);
      expect(order.lines.length).toBeLessThanOrEqual(3);
      const works = order.lines.map((line) => work.get(line.sku));
      expect(works).not.toContain(undefined);
      expect(new Set(works).size).toBe(works.length);
      for (const line of order.lines) {
        expect([1, 2]).toContain(line.quantity);
      }
    }
  });

  it('dates each order by what has happened to it by now', () => {
    const fates = new Set(plan.orders.map((order) => order.fate));
    expect(fates).toEqual(new Set(['awaiting-shipment', 'shipped', 'delivered', 'cancelled']));
    for (const order of plan.orders) {
      const placed = order.placedAt.getTime();
      const shipped = order.shippedAt?.getTime() ?? null;
      const delivered = order.deliveredAt?.getTime() ?? null;
      const cancelled = order.cancelledAt?.getTime() ?? null;
      switch (order.fate) {
        case 'awaiting-shipment':
          expect([shipped, delivered, cancelled]).toEqual([null, null, null]);
          expect(placed).toBeGreaterThan(now.getTime() - 4 * DAY);
          break;
        case 'shipped':
          expect(shipped).toBeGreaterThan(placed + 20 * HOUR);
          expect(shipped).toBeLessThanOrEqual(now.getTime());
          expect([delivered, cancelled]).toEqual([null, null]);
          break;
        case 'delivered':
          expect(delivered).toBeGreaterThan((shipped ?? Infinity) + 2 * DAY);
          expect(delivered).toBeLessThanOrEqual(now.getTime());
          expect(cancelled).toBeNull();
          break;
        case 'cancelled':
          expect(cancelled).toBeGreaterThan(placed);
          expect(cancelled).toBeLessThan(placed + DAY);
          expect([shipped, delivered]).toEqual([null, null]);
          break;
      }
    }
  });

  it('ships in working hours and delivers by day, in UTC', () => {
    const hourOf = (date: Date | null) => (date === null ? null : date.getUTCHours());
    for (const order of plan.orders) {
      const shipped = hourOf(order.shippedAt);
      const delivered = hourOf(order.deliveredAt);
      if (shipped !== null) {
        expect(shipped).toBeGreaterThanOrEqual(9);
        expect(shipped).toBeLessThan(17);
      }
      if (delivered !== null) {
        expect(delivered).toBeGreaterThanOrEqual(9);
        expect(delivered).toBeLessThan(19);
      }
    }
  });

  it('brings some customers back, and has every customer buy from a country the shop ships to', () => {
    expect(plan.customers).toHaveLength(12);
    const orders = plan.customers.map(
      (_, index) => plan.orders.filter((order) => order.customer === index).length,
    );
    expect(Math.max(...orders)).toBeGreaterThan(Math.min(...orders));
    const shipsTo = new Set(COUNTRIES.map((country) => country.code));
    for (const customer of plan.customers) {
      expect(shipsTo.has(customer.address.countryCode), customer.emailAddress).toBe(true);
      expect(customer.address.streetLine1).toMatch(/^\d+ \S/);
    }
    const emails = plan.customers.map((customer) => customer.emailAddress);
    expect(new Set(emails).size).toBe(emails.length);
  });

  it('sells the favourites more often than the rest', () => {
    const favoured = demoPlan(variants, { ...options, favourites: ['f'] });
    const sold = (work: string) =>
      favoured.orders.flatMap((order) => order.lines).filter((line) => line.sku.startsWith(work))
        .length;
    for (const other of ['a', 'b', 'c', 'd', 'e']) {
      expect(sold('f')).toBeGreaterThan(sold(other));
    }
  });

  it('refuses a plan it cannot draw', () => {
    expect(() => demoPlan(variants, { ...options, customers: 0 })).toThrow(/customers/);
    expect(() => demoPlan(variants, { ...options, customers: 41 })).toThrow(/customers/);
    expect(() => demoPlan([], options)).toThrow(/catalogue is empty/);
  });
});

describe('emailOf', () => {
  it('writes an address at the example domain, in ASCII', () => {
    expect(emailOf({ firstName: 'Ana Beatriz', lastName: 'Souza' })).toBe(
      'ana.beatriz.souza@example.com',
    );
    expect(emailOf({ firstName: 'Lucía', lastName: 'García' })).toBe('lucia.garcia@example.com');
    expect(emailOf({ firstName: 'Ji-woo', lastName: 'Park' })).toBe('ji-woo.park@example.com');
    expect(emailOf({ firstName: 'Sanne', lastName: 'de Vries' })).toBe(
      'sanne.de.vries@example.com',
    );
  });
});

describe('momentOf', () => {
  const placedAt = new Date('2026-09-01T10:00:00Z');
  const at = (offset: number) => new Date(placedAt.getTime() + offset);
  const delivered: DemoOrder = {
    customer: 0,
    placedAt,
    lines: [{ sku: 'a-A3', quantity: 1 }],
    fate: 'delivered',
    shippedAt: at(2 * DAY),
    deliveredAt: at(6 * DAY),
    cancelledAt: null,
  };
  const cancelled: DemoOrder = {
    ...delivered,
    fate: 'cancelled',
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: at(5 * HOUR),
  };

  it('spreads a delivered order from its cart to its doorstep', () => {
    const transition = (to: string) => momentOf(delivered, { type: 'ORDER_STATE_TRANSITION', to });
    expect(transition('AddingItems')).toEqual(at(-8 * 60_000));
    expect(transition('ArrangingPayment')).toEqual(at(-2 * 60_000));
    expect(transition('PaymentSettled')).toEqual(placedAt);
    expect(momentOf(delivered, { type: 'ORDER_PAYMENT_TRANSITION', to: 'Settled' })).toEqual(
      placedAt,
    );
    expect(momentOf(delivered, { type: 'ORDER_FULFILLMENT' })).toEqual(at(2 * DAY - 2 * HOUR));
    expect(momentOf(delivered, { type: 'ORDER_FULFILLMENT_TRANSITION', to: 'Pending' })).toEqual(
      at(2 * DAY - 2 * HOUR),
    );
    expect(transition('Shipped')).toEqual(at(2 * DAY));
    expect(transition('PartiallyShipped')).toEqual(at(2 * DAY));
    expect(transition('Delivered')).toEqual(at(6 * DAY));
    expect(transition('PartiallyDelivered')).toEqual(at(6 * DAY));
  });

  it('puts a cancellation and its refund after the payment', () => {
    expect(momentOf(cancelled, { type: 'ORDER_CANCELLATION' })).toEqual(at(5 * HOUR));
    expect(momentOf(cancelled, { type: 'ORDER_STATE_TRANSITION', to: 'Cancelled' })).toEqual(
      at(5 * HOUR),
    );
    expect(momentOf(cancelled, { type: 'ORDER_REFUND_TRANSITION', to: 'Settled' })).toEqual(
      at(6 * HOUR),
    );
  });

  it('falls back on the moment of payment for dates the plan does not have', () => {
    const waiting: DemoOrder = { ...cancelled, fate: 'awaiting-shipment', cancelledAt: null };
    expect(momentOf(waiting, { type: 'ORDER_STATE_TRANSITION', to: 'Delivered' })).toEqual(
      placedAt,
    );
    expect(momentOf(waiting, { type: 'ORDER_CANCELLATION' })).toEqual(placedAt);
    expect(momentOf(waiting, { type: 'ORDER_NOTE' })).toEqual(placedAt);
  });
});
