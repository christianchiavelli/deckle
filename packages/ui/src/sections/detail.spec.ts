import { describe, expect, it } from 'vitest';
import { placement } from './detail.ts';

// Melencolia I, as the importer reduced it: portrait, 1901 × 2400.
const portrait = { width: 1901, height: 2400 };

describe('placement', () => {
  it('covers a square frame with the whole print at zoom 1, centred', () => {
    const place = placement(portrait, 1, { x: 50, y: 50, zoom: 1 });
    expect(place.width).toBe(100);
    expect(place.height).toBeCloseTo((2400 / 1901) * 100);
    expect(place.left).toBe(0);
    expect(place.top).toBeCloseTo((100 - place.height) / 2);
  });

  it('puts the chosen point in the middle of the frame', () => {
    const place = placement(portrait, 1, { x: 60, y: 40, zoom: 4 });
    expect(place.left + (60 / 100) * place.width).toBeCloseTo(50);
    expect(place.top + (40 / 100) * place.height).toBeCloseTo(50);
  });

  it('never shows past the edge of the print', () => {
    const corner = placement(portrait, 5 / 4, { x: 99, y: 1, zoom: 3 });
    expect(corner.left).toBeCloseTo(100 - corner.width);
    expect(corner.top).toBe(0);
  });

  it('fits a landscape print by its height in a narrower frame', () => {
    const place = placement({ width: 3000, height: 2000 }, 1, { x: 50, y: 50, zoom: 1 });
    expect(place.height).toBe(100);
    expect(place.width).toBeCloseTo(150);
    expect(place.left).toBeCloseTo(-25);
  });
});
