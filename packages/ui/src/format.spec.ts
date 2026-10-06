import { describe, expect, it } from 'vitest';
import { formatCentimetres, formatMoney, formatPpi, MISSING } from './format.ts';

describe('formatMoney', () => {
  it('drops the cents of a whole amount', () => {
    expect(formatMoney(9000, 'USD', 'en-US')).toBe('$90');
  });

  it('keeps the cents when there are some', () => {
    expect(formatMoney(5550, 'USD', 'en-US')).toBe('$55.50');
  });

  it('writes dollars the Brazilian way in Portuguese', () => {
    // Intl separates the symbol with a no-break space, so the price never wraps.
    expect(formatMoney(9000, 'USD', 'pt-BR')).toBe('US$ 90');
    expect(formatMoney(123456, 'USD', 'pt-BR')).toBe('US$ 1.234,56');
  });

  it('shows a dash for a price commerce does not have, never a zero', () => {
    expect(formatMoney(null, 'USD', 'en-US')).toBe(MISSING);
  });
});

describe('formatCentimetres', () => {
  it('writes width by height with the unit once', () => {
    expect(formatCentimetres({ width: 29.7, height: 42 }, 'en-US')).toBe('29.7 × 42 cm');
  });

  it('uses the decimal comma in Portuguese', () => {
    expect(formatCentimetres({ width: 21, height: 29.7 }, 'pt-BR')).toBe('21 × 29,7 cm');
  });

  it('rounds to the tenth a print size is quoted in', () => {
    expect(formatCentimetres({ width: 59.44, height: 84.06 }, 'en-US')).toBe('59.4 × 84.1 cm');
  });
});

describe('formatPpi', () => {
  it('groups thousands in the reader’s locale', () => {
    expect(formatPpi(302, 'en-US')).toBe('302 ppi');
    expect(formatPpi(1200, 'en-US')).toBe('1,200 ppi');
    expect(formatPpi(1200, 'pt-BR')).toBe('1.200 ppi');
  });
});
