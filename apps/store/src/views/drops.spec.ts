import { describe, expect, it } from 'vitest';
import { copy } from '../copy';
import { melencoliaDrop, NOW, stockOf, waveDrop } from '../test/drops';
import {
  allClaimed,
  announcementOf,
  calloutOf,
  chipOf,
  factsOf,
  featuredDrop,
  headlineOf,
  marksOf,
  openingOf,
  paragraphsOf,
  phaseOf,
  priceOf,
  recordOf,
  soonChipOf,
  standingOf,
  stocksBySlug,
  tallyOf,
} from './drops';

const fresh = stockOf(50, 0, 0);
const busy = stockOf(50, 18, 2);
const gone = stockOf(50, 50, 0);

describe('stocksBySlug', () => {
  it('files each stock under its drop', () => {
    const stocks = stocksBySlug([{ slug: melencoliaDrop.slug, stock: busy }]);
    expect(stocks.get(melencoliaDrop.slug)).toBe(busy);
    expect(stocks.size).toBe(1);
  });
});

describe('phaseOf', () => {
  it('is soon before the hour and open from it', () => {
    expect(phaseOf(waveDrop, NOW)).toBe('soon');
    expect(phaseOf(melencoliaDrop, NOW)).toBe('open');
    expect(phaseOf(melencoliaDrop, Date.parse(melencoliaDrop.opensAt))).toBe('open');
  });
});

describe('allClaimed', () => {
  it('is true only when nothing is open and nothing held could come back', () => {
    expect(allClaimed(gone)).toBe(true);
    expect(allClaimed(stockOf(50, 49, 1))).toBe(false);
    expect(allClaimed(busy)).toBe(false);
  });
});

describe('marksOf', () => {
  it('marks the held and the claimed copies, and the reader’s own over either', () => {
    expect(marksOf(stockOf(5, 2, 1), null)).toEqual({ 1: 'claimed', 2: 'claimed', 3: 'held' });
    expect(marksOf(stockOf(5, 2, 1), 3)).toEqual({ 1: 'claimed', 2: 'claimed', 3: 'yours' });
    expect(marksOf(fresh, null)).toEqual({});
  });
});

describe('tallyOf and standingOf', () => {
  it('counts the open, held and claimed copies', () => {
    expect(tallyOf(busy, copy)).toEqual([
      { value: '30', unit: 'open' },
      { value: '2', unit: 'held' },
      { value: '18', unit: 'claimed' },
    ]);
  });

  it('captions the grid, and names it with the open count', () => {
    expect(standingOf(fresh, 50, copy)).toEqual({
      caption: '50 copies · none claimed yet',
      label: 'Copies 1 to 50, 50 open',
    });
    expect(standingOf(busy, 50, copy)).toEqual({
      caption: '50 copies · 18 claimed · 2 held · 30 open',
      label: 'Copies 1 to 50, 30 open',
    });
  });
});

describe('the words on a drop', () => {
  it('takes the editor’s headline, or makes one from the work until there is one', () => {
    expect(headlineOf(melencoliaDrop, copy)).toBe('Melencolia I, in fifty numbered copies');
    expect(headlineOf(waveDrop, copy)).toBe('Under the Wave off Kanagawa, in 50 numbered copies');
    expect(headlineOf({ ...waveDrop, artwork: null }, copy)).toBe(
      'the-great-wave-numbered, in 50 numbered copies',
    );
  });

  it('reads the editor’s paragraphs as plain text, and nothing else', () => {
    expect(paragraphsOf(melencoliaDrop)).toEqual([
      'Each copy is A3, printed from The Met’s scan at 302 ppi.',
    ]);
    expect(paragraphsOf(waveDrop)).toEqual([]);
  });

  it('gives the price, or a dash while commerce sells no edition', () => {
    expect(priceOf(melencoliaDrop, copy)).toBe('$180');
    expect(priceOf({ price: null }, copy)).toBe('—');
  });

  it('says when it opens, in UTC', () => {
    expect(openingOf(waveDrop, copy)).toBe('Thu 15 Oct, 18:00 UTC');
  });
});

describe('chipOf', () => {
  it('says when a drop opens, that it is open, or that its copies are gone', () => {
    expect(chipOf(waveDrop, null, NOW, copy)).toEqual({ label: 'Opens Thu 15 Oct', tone: 'soft' });
    expect(chipOf(melencoliaDrop, busy, NOW, copy)).toEqual({ label: 'Open now', tone: 'accent' });
    expect(chipOf(melencoliaDrop, null, NOW, copy)).toEqual({ label: 'Open now', tone: 'accent' });
    expect(chipOf(melencoliaDrop, gone, NOW, copy)).toEqual({
      label: 'Every copy claimed',
      tone: 'soft',
    });
  });

  it('counts the days on a drop’s own page', () => {
    expect(soonChipOf(waveDrop, NOW, copy)).toBe('Opens in 8 days');
    expect(soonChipOf(waveDrop, Date.parse('2026-10-14T12:00:00Z'), copy)).toBe('Opens tomorrow');
    expect(soonChipOf(waveDrop, Date.parse('2026-10-15T12:00:00Z'), copy)).toBe('Opens today');
  });
});

describe('factsOf', () => {
  it('gives the opening before the hour, and the open count after it', () => {
    expect(factsOf(waveDrop, null, NOW, copy)).toEqual([
      { term: 'Opens', detail: 'Thu 15 Oct, 18:00 UTC' },
      { term: 'Price', detail: '$180' },
      { term: 'Limit', detail: 'One per person' },
    ]);
    expect(factsOf(melencoliaDrop, busy, NOW, copy)[0]).toEqual({
      term: 'Open',
      detail: '30 of 50',
    });
    expect(factsOf(melencoliaDrop, null, NOW, copy)[0]).toEqual({ term: 'Open', detail: '—' });
  });
});

describe('featuredDrop', () => {
  const stocks = new Map([
    [melencoliaDrop.slug, busy],
    [waveDrop.slug, fresh],
  ]);

  it('features an open drop with copies left', () => {
    expect(featuredDrop([waveDrop, melencoliaDrop], stocks, NOW)).toBe(melencoliaDrop);
  });

  it('features the next to open once the open ones have run out', () => {
    const later = { ...waveDrop, slug: 'later', opensAt: '2026-11-01T18:00:00.000Z' };
    const out = new Map([...stocks, [melencoliaDrop.slug, gone]]);
    expect(featuredDrop([later, melencoliaDrop, waveDrop], out, NOW)).toBe(waveDrop);
  });

  it('features nothing when every drop has run out, or an open one has no stock read', () => {
    expect(featuredDrop([melencoliaDrop], new Map([[melencoliaDrop.slug, gone]]), NOW)).toBeNull();
    expect(featuredDrop([melencoliaDrop], new Map(), NOW)).toBeNull();
  });
});

describe('announcementOf and calloutOf', () => {
  it('announces the drop that is open, or the hour of the next', () => {
    expect(announcementOf(melencoliaDrop, NOW, copy)).toEqual({
      text: 'Melencolia I, in numbered copies, is open now',
      link: 'Claim a copy',
    });
    expect(announcementOf(waveDrop, NOW, copy)).toEqual({
      text: 'A numbered edition of Under the Wave off Kanagawa opens on Thu 15 Oct at 18:00 UTC',
      link: 'See the drop',
    });
    expect(announcementOf({ ...waveDrop, artwork: null }, NOW, copy).text).toContain(
      'the-great-wave-numbered',
    );
  });

  it('points from a work to its numbered edition', () => {
    expect(calloutOf(waveDrop, NOW, copy)).toEqual({
      title: 'A numbered edition of 50',
      detail: 'Opens Thu 15 Oct, 18:00 UTC. One per person, with a passkey',
    });
    expect(calloutOf(melencoliaDrop, NOW, copy).detail).toBe(
      'Open now. One per person, with a passkey',
    );
  });
});

describe('recordOf', () => {
  it('records the paper, the resolution, the edition, the price and the limit', () => {
    expect(recordOf(melencoliaDrop, copy)).toEqual([
      { term: 'Size', detail: 'A3, 29.7 × 42 cm' },
      { term: 'Resolution', detail: '302 ppi, from The Met’s scan of 2,820 × 3,561 px' },
      { term: 'Paper', detail: 'Cotton rag, pigment inks' },
      { term: 'Edition', detail: '50 copies, numbered 1/50 to 50/50' },
      { term: 'Price', detail: '$180' },
      { term: 'Limit', detail: 'One per person' },
    ]);
  });

  it('leaves out what commerce or the museum has not said', () => {
    const bare = { ...melencoliaDrop, paperSize: null, price: null };
    const entries = recordOf(bare, copy);
    expect(entries[0]?.detail).toBeNull();
    expect(entries[1]?.detail).toBeNull();
    expect(entries[4]?.detail).toBeNull();
    const unscanned = {
      ...melencoliaDrop,
      artwork: melencoliaDrop.artwork && { ...melencoliaDrop.artwork, image: null },
    };
    expect(recordOf(unscanned, copy)[1]?.detail).toBeNull();
    expect(recordOf({ ...melencoliaDrop, artwork: null }, copy)[0]?.detail).toBeNull();
  });
});
