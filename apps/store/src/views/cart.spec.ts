import { describe, expect, it } from 'vitest';
import { copy } from '../copy';
import { cart, cartLine, copyOrder, placedOrder } from '../test/drops';
import { lineOf, moneyOf, orderSummaryOf, summaryOf } from './cart';

describe('moneyOf', () => {
  it('writes an amount, or a dash for one commerce left out', () => {
    expect(moneyOf({ amount: 9000, currencyCode: 'USD' }, copy)).toBe('$90');
    expect(moneyOf(null, copy)).toBe('—');
  });
});

describe('lineOf', () => {
  it('shows a print with its maker, its size and price, and what the line comes to', () => {
    expect(lineOf(cartLine({ id: '11', quantity: 2 }), copy)).toEqual({
      id: '11',
      href: '/prints/melencolia-i',
      image: {
        src: 'http://localhost:8080/assets/source/melencolia-i.webp?preset=thumb&format=webp',
        width: 1901,
        height: 2400,
      },
      title: 'Melencolia I',
      meta: 'Albrecht Dürer, 1514',
      size: 'A3, unframed · $90 each',
      total: '$90',
      quantity: 2,
      paper: 'A3',
    });
  });

  it('falls back to the slug, and no picture, for a work commerce no longer sells', () => {
    const line = lineOf(cartLine({ id: '12', artwork: null, size: null }), copy);
    expect(line).toMatchObject({ title: 'melencolia-i', image: null, meta: '', paper: '—' });
  });

  it('names a numbered copy by its number, and leads to its drop', () => {
    const [line] = copyOrder.lines;
    expect(line && lineOf(line, copy)).toMatchObject({
      href: '/drops/melencolia-i-numbered',
      title: 'Melencolia I, copy 7 of 50',
      size: 'A3, numbered 7/50 in pencil',
      total: '$180',
    });
  });

  it('treats an order line without a drop as a print', () => {
    const [line] = placedOrder.lines;
    expect(line && lineOf(line, copy).href).toBe('/prints/melencolia-i');
  });
});

describe('summaryOf', () => {
  it('sums the prints, adds the tube, and closes on the total', () => {
    expect(summaryOf(cart, copy)).toEqual([
      { label: 'Subtotal, 3 prints', value: '$270' },
      { label: 'Shipping, rolled in a tube', value: '$12' },
      { label: 'Total', value: '$282' },
    ]);
  });
});

describe('orderSummaryOf', () => {
  it('sums an order of prints as the cart did', () => {
    expect(orderSummaryOf(placedOrder, copy)).toEqual(summaryOf(cart, copy));
  });

  it('names the copy paid for, with its shipping included', () => {
    expect(orderSummaryOf(copyOrder, copy)).toEqual([
      { label: 'Copy 7 of 50', value: '$180' },
      { label: 'Shipping, rolled in a tube', value: 'Included' },
      { label: 'Total', value: '$180' },
    ]);
  });

  it('sums a copy that came with a charge for shipping as an ordinary order', () => {
    const charged = {
      ...copyOrder,
      shipping: { __typename: 'Money' as const, amount: 1200, currencyCode: 'USD' },
    };
    expect(orderSummaryOf(charged, copy)[0]?.label).toBe('Subtotal, 1 print');
  });
});
