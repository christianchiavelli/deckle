import { PAPER_SIZE_ORDER } from '@deckle/print-sizes';
import { describe, expect, it } from 'vitest';
import { DROPS, opensAt } from './index.js';

describe('DROPS', () => {
  it('names each drop once', () => {
    const slugs = DROPS.map((drop) => drop.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('gives each a paper size, a whole number of copies and a price in cents', () => {
    for (const drop of DROPS) {
      expect(PAPER_SIZE_ORDER).toContain(drop.paperSize);
      expect(Number.isInteger(drop.editionSize)).toBe(true);
      expect(drop.editionSize).toBeGreaterThan(0);
      expect(Number.isInteger(drop.price)).toBe(true);
      expect(drop.price).toBeGreaterThan(0);
    }
  });

  it('opens one at once and keeps one to come', () => {
    expect(DROPS.some((drop) => drop.opensAfterDays === 0)).toBe(true);
    expect(DROPS.some((drop) => drop.opensAfterDays > 0)).toBe(true);
  });
});

describe('opensAt', () => {
  const recordedAt = new Date('2026-10-07T09:41:00Z');

  it('opens a drop with no wait the moment it is recorded', () => {
    expect(opensAt({ opensAfterDays: 0 }, recordedAt)).toEqual(recordedAt);
  });

  it('opens a later one at 18:00 UTC on its day', () => {
    expect(opensAt({ opensAfterDays: 8 }, recordedAt).toISOString()).toBe(
      '2026-10-15T18:00:00.000Z',
    );
  });

  it('counts days across the end of a month', () => {
    expect(opensAt({ opensAfterDays: 2 }, new Date('2026-10-31T23:30:00Z')).toISOString()).toBe(
      '2026-11-02T18:00:00.000Z',
    );
  });
});
