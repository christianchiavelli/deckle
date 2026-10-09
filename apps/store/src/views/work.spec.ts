import { describe, expect, it } from 'vitest';
import { en as copy } from '../copy/en';
import { greatWave, melencolia } from '../test/works';
import {
  defaultSize,
  factsOf,
  lifeOf,
  limitedAcross,
  printedAt,
  recordOf,
  sizeOfOriginal,
  smallestFirst,
  storyFigureOf,
  tooSmallNote,
} from './work';

describe('lifeOf', () => {
  it("writes the maker's nationality and years", () => {
    expect(lifeOf(melencolia.artist)).toBe('German, 1471–1528');
  });

  it('marks a missing year with a dash, and leaves out what the record lacks', () => {
    const artist = {
      name: 'Anonymous',
      bio: null,
      nationality: null,
      beginYear: 1471,
      endYear: null,
    };
    expect(lifeOf(artist)).toBe('1471–—');
    expect(lifeOf({ ...artist, beginYear: null, endYear: 1528 })).toBe('—–1528');
    expect(lifeOf({ ...artist, beginYear: null })).toBe('');
    expect(lifeOf({ ...artist, beginYear: null, nationality: 'German' })).toBe('German');
    expect(lifeOf(null)).toBe('');
  });
});

describe('sizeOfOriginal', () => {
  it('keeps the part and the centimetres of the first measurement', () => {
    expect(sizeOfOriginal(melencolia.dimensions)).toBe('Plate 24 × 18.5 cm');
    expect(sizeOfOriginal(greatWave.dimensions)).toBe('25.7 x 37.9 cm');
  });

  it('gives nothing when the museum gives no centimetres', () => {
    expect(sizeOfOriginal(['Sheet: 9 1/2 in.'])).toBeNull();
    expect(sizeOfOriginal([])).toBeNull();
  });
});

describe('factsOf', () => {
  it('puts the date, the medium and the size of the original on one line', () => {
    expect(factsOf(melencolia)).toBe('1514 · Engraving · Plate 24 × 18.5 cm');
    expect(factsOf({ date: null, medium: 'Etching', dimensions: [] })).toBe('Etching');
  });
});

describe('the sizes', () => {
  it('orders them from A4 up, whatever order they came in', () => {
    expect(smallestFirst([...melencolia.sizes].reverse()).map((size) => size.size)).toEqual([
      'A4',
      'A3',
      'A2',
      'A1',
    ]);
  });

  it('offers A3 first, else the largest for sale, else nothing', () => {
    expect(defaultSize(melencolia.sizes)?.size).toBe('A3');
    const noA3 = melencolia.sizes.map((size) =>
      size.size === 'A3' ? { ...size, available: false } : size,
    );
    expect(defaultSize(noA3)?.size).toBe('A4');
    expect(defaultSize(melencolia.sizes.map((size) => ({ ...size, available: false })))).toBeNull();
  });

  it('knows which side sets the scale: the one left with the narrower margin', () => {
    const [, , melencoliaA2, ,] = melencolia.sizes;
    const [, , waveA2] = greatWave.sizes;
    expect(limitedAcross(melencoliaA2!)).toBe(true);
    expect(limitedAcross(waveA2!)).toBe(false);
  });

  it('says what the next size up would need, on the side that runs short', () => {
    expect(tooSmallNote(melencolia, copy)).toBe(
      'A2 would need 3,213 px across the image. The Met’s scan has 2,820, and we never upscale.',
    );
    expect(tooSmallNote(greatWave, copy)).toBe(
      'A2 would need 3,213 px down the image. The Met’s scan has 2,594, and we never upscale.',
    );
  });

  it('says it shorter where the scan’s size has just been given', () => {
    expect(tooSmallNote(melencolia, copy, copy.sizes.limit)).toBe(
      'A2 would need 3,213 px across the image; the scan has 2,820.',
    );
  });

  it('says nothing when every size prints, or when the scan is not what stops one', () => {
    const everySize = melencolia.sizes.map((size) => ({
      ...size,
      available: true,
      requiredPixels: null,
      unavailableReason: null,
    }));
    expect(tooSmallNote({ ...melencolia, sizes: everySize }, copy)).toBeNull();
    const notOffered = melencolia.sizes.map((size) =>
      size.available ? size : { ...size, unavailableReason: 'NOT_OFFERED' as const },
    );
    expect(tooSmallNote({ ...melencolia, sizes: notOffered }, copy)).toBeNull();
    const unmeasured = melencolia.sizes.map((size) => ({ ...size, requiredPixels: null }));
    expect(tooSmallNote({ ...melencolia, sizes: unmeasured }, copy)).toBeNull();
    expect(tooSmallNote({ ...melencolia, image: null }, copy)).toBeNull();
  });

  it('states the resolution of the size chosen', () => {
    expect(printedAt(defaultSize(melencolia.sizes)!, copy)).toBe(
      'Printed at 302 ppi on A3, from the museum’s own scan',
    );
  });
});

describe('recordOf', () => {
  it("lists the museum's record in catalogue order, its own words marked as English", () => {
    expect(recordOf(melencolia, copy)).toEqual([
      {
        term: 'Artist',
        detail: 'Albrecht Dürer, German, Nuremberg 1471–1528 Nuremberg',
        lang: 'en',
      },
      { term: 'Date', detail: '1514', lang: 'en' },
      { term: 'Medium', detail: 'Engraving', lang: 'en' },
      { term: 'Dimensions', detail: 'Plate: 9 7/16 × 7 5/16 in. (24 × 18.5 cm)', lang: 'en' },
      { term: 'Culture', detail: null, lang: 'en' },
      { term: 'Period', detail: null, lang: 'en' },
      { term: 'Credit line', detail: 'Harris Brisbane Dick Fund, 1943', lang: 'en' },
      { term: 'Object number', detail: '43.106.1' },
      { term: 'Rights', detail: 'Public domain, Open Access (CC0)' },
      { term: 'Scan', detail: '2,820 × 3,561 px, read from the file' },
    ]);
  });

  it('leaves a gap where the record has none, for the page to mark', () => {
    const entries = recordOf({ ...melencolia, artist: null, dimensions: [], image: null }, copy);
    const detail = (term: string) => entries.find((entry) => entry.term === term)?.detail;
    expect(detail('Artist')).toBeNull();
    expect(detail('Dimensions')).toBeNull();
    expect(detail('Scan')).toBeNull();
    const nameOnly = recordOf(
      { ...melencolia, artist: { ...melencolia.artist!, bio: null } },
      copy,
    );
    expect(nameOnly[0]?.detail).toBe('Albrecht Dürer');
  });
});

describe('storyFigureOf', () => {
  const words = {
    alt: 'The magic square set into the wall, with the bell above it.',
    caption: 'Every row, column and diagonal adds up to 34',
  };
  const told = (
    detail: {
      x: number;
      y: number;
      zoom: number;
      alt: string | null;
      caption: string | null;
    } | null,
  ) => ({
    ...melencolia,
    story: { title: 'About the engraving', lede: null, detail, blocks: [], sources: [] },
  });

  it('cuts the detail out of the whole master, with its words', () => {
    expect(storyFigureOf(told({ x: 74, y: 22, zoom: 3, ...words }))).toEqual({
      src: `${melencolia.image?.url ?? ''}?preset=zoom&format=webp`,
      width: 1901,
      height: 2400,
      ...words,
      detail: { x: 74, y: 22, zoom: 3 },
    });
  });

  it('shows none until both its words are written, nor for a story without a detail', () => {
    const point = { x: 74, y: 22, zoom: 3 };
    expect(storyFigureOf(told({ ...point, ...words, alt: null }))).toBeUndefined();
    expect(storyFigureOf(told({ ...point, ...words, caption: null }))).toBeUndefined();
    expect(storyFigureOf(told(null))).toBeUndefined();
    expect(storyFigureOf(melencolia)).toBeUndefined();
    expect(storyFigureOf({ ...told({ ...point, ...words }), image: null })).toBeUndefined();
  });
});
