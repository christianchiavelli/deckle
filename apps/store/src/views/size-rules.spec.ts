import { describe, expect, it } from 'vitest';
import { copy } from '../copy';
import { listedFrom, melencolia, optionsFor } from '../test/works';
import { noneAt, sizeRulesOf, verdictOf } from './size-rules';

const reachingA2 = {
  ...listedFrom(melencolia, 1514),
  sizes: optionsFor({ width: 3335, height: 3859 }).map(({ size, available }) => ({
    size,
    available,
  })),
};

describe('sizeRulesOf', () => {
  it('gives each sheet, the area inside its border, the pixels that takes, and who reaches it', () => {
    expect(sizeRulesOf([listedFrom(melencolia, 1514), reachingA2], copy)).toEqual([
      {
        size: 'A4',
        sheet: '21 × 29.7 cm',
        area: '16 × 24.7 cm',
        pixels: '1,512 × 2,334 px',
        works: 2,
      },
      {
        size: 'A3',
        sheet: '29.7 × 42 cm',
        area: '23.7 × 36 cm',
        pixels: '2,240 × 3,402 px',
        works: 2,
      },
      {
        size: 'A2',
        sheet: '42 × 59.4 cm',
        area: '34 × 51.4 cm',
        pixels: '3,213 × 4,857 px',
        works: 1,
      },
      {
        size: 'A1',
        sheet: '59.4 × 84.1 cm',
        area: '49.4 × 74.1 cm',
        pixels: '4,668 × 7,002 px',
        works: 0,
      },
    ]);
  });
});

describe('noneAt', () => {
  it('names the first size no work reaches, or none', () => {
    const rules = sizeRulesOf([reachingA2], copy);
    expect(noneAt(rules)).toBe('A1');
    expect(noneAt(rules.slice(0, 3))).toBeNull();
  });
});

describe('verdictOf', () => {
  it('says how far a scan goes', () => {
    expect(verdictOf(optionsFor({ width: 1566, height: 2006 }), copy)).toBe('A4 only');
    expect(verdictOf(optionsFor({ width: 2820, height: 3561 }), copy)).toBe('Up to A3');
    expect(verdictOf(optionsFor({ width: 3335, height: 3859 }), copy)).toBe('Up to A2');
  });

  it('says nothing of a work sold at no size', () => {
    expect(
      verdictOf(
        optionsFor({ width: 2820, height: 3561 }).map((option) => ({
          ...option,
          available: false,
        })),
        copy,
      ),
    ).toBeNull();
  });
});
