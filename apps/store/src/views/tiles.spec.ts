import { describe, expect, it } from 'vitest';
import { en as copy } from '../copy/en';
import { greatWave, melencolia, tileFrom } from '../test/works';
import { imageAt } from './images';
import { metaOf, priceOf, tileOf, tilesOf } from './tiles';

describe('imageAt', () => {
  it('asks the asset server for one of its presets, as WebP', () => {
    expect(imageAt('http://localhost:8080/assets/source/a.webp', 'card')).toBe(
      'http://localhost:8080/assets/source/a.webp?preset=card&format=webp',
    );
    expect(imageAt('/assets/source/a.webp?v=2', 'page')).toBe(
      '/assets/source/a.webp?v=2&preset=page&format=webp',
    );
  });
});

describe('metaOf', () => {
  it('names the maker and the date, or whichever there is', () => {
    expect(metaOf(melencolia)).toBe('Albrecht Dürer, 1514');
    expect(metaOf({ artist: null, date: '1514' })).toBe('1514');
    expect(metaOf({ artist: { name: 'Hokusai' }, date: null })).toBe('Hokusai');
  });
});

describe('priceOf', () => {
  const tile = tileFrom(melencolia);

  it('starts the price at the smallest size when there are several', () => {
    expect(priceOf(tile, copy)).toEqual({ price: 'From $55', only: null });
  });

  it('gives the one price, and the one size, when only one is sold', () => {
    const one = {
      priceFrom: { amount: 9000, currencyCode: 'USD' },
      sizes: tile.sizes.map((size) => ({ ...size, available: size.size === 'A3' })),
    };
    expect(priceOf(one, copy)).toEqual({ price: '$90', only: 'A3 only' });
  });

  it('shows a dash when nothing is for sale, or when commerce set no price', () => {
    const none = { ...tile, sizes: tile.sizes.map((size) => ({ ...size, available: false })) };
    expect(priceOf(none, copy)).toEqual({ price: '—', only: null });
    expect(priceOf({ ...tile, priceFrom: null }, copy)).toEqual({ price: '—', only: null });
  });
});

describe('tileOf', () => {
  it('draws a work as a tile, its picture at the card preset', () => {
    expect(tileOf(tileFrom(greatWave), copy)).toEqual({
      slug: 'under-the-wave-off-kanagawa',
      image: {
        src: 'http://localhost:8080/assets/source/under-the-wave-off-kanagawa.webp?preset=card&format=webp',
        width: 2400,
        height: 1613,
      },
      title: 'Under the Wave off Kanagawa',
      meta: 'Katsushika Hokusai, ca. 1830–32',
      price: 'From $55',
      only: null,
    });
  });

  it('leaves out a work with no picture', () => {
    const blank = { ...tileFrom(melencolia), image: null };
    expect(tileOf(blank, copy)).toBeNull();
    expect(tilesOf([blank, tileFrom(greatWave)], copy).map((tile) => tile.slug)).toEqual([
      'under-the-wave-off-kanagawa',
    ]);
  });
});
