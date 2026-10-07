import { RequestContext, type Order, type OrderLine, type ShippingMethod } from '@vendure/core';
import { describe, expect, it } from 'vitest';
import { holdsOnlyNumberedCopies, numberedCopiesOnly } from './shipping-eligibility.js';

const line = (editionSize: number | null) =>
  ({ productVariant: { customFields: { editionSize } } }) as unknown as OrderLine;

const orderOf = (...lines: OrderLine[]) => ({ lines }) as Order;

describe('holdsOnlyNumberedCopies', () => {
  it('holds for an order of numbered copies', () => {
    expect(holdsOnlyNumberedCopies(orderOf(line(50)))).toBe(true);
    expect(holdsOnlyNumberedCopies(orderOf(line(50), line(25)))).toBe(true);
  });

  it('fails for open editions, alone or beside a numbered copy', () => {
    expect(holdsOnlyNumberedCopies(orderOf(line(null)))).toBe(false);
    expect(holdsOnlyNumberedCopies(orderOf(line(50), line(null)))).toBe(false);
  });

  it('fails for an empty order, which has nothing to ship free', () => {
    expect(holdsOnlyNumberedCopies(orderOf())).toBe(false);
  });
});

describe('numberedCopiesOnly', () => {
  const method = {} as ShippingMethod;

  it('offers the free method to a numbered copy, and not to a cart of open editions', async () => {
    const ctx = RequestContext.empty();
    expect(await numberedCopiesOnly.check(ctx, orderOf(line(50)), [], method)).toBe(true);
    expect(await numberedCopiesOnly.check(ctx, orderOf(line(null)), [], method)).toBe(false);
  });
});
