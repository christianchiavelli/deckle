import { describe, expect, it } from 'vitest';
import { greatWave, listedFrom, melencolia } from '../test/works';
import type { ListedWork } from './listing';
import {
  fold,
  MAX_QUERY,
  queryFrom,
  searchWorks,
  typosAllowed,
  withinEdits,
  wordsOf,
} from './search';

/** A work from The Met's record, with the fields a search reads changed. */
const work = (slug: string, year: number, fields: Partial<ListedWork>): ListedWork => ({
  ...listedFrom(melencolia, year),
  slug,
  ...fields,
});

const witches = work('the-witches', 1510, {
  title: 'The Witches',
  fullTitle: 'The Witches',
  artist: { name: 'Hans Baldung (called Hans Baldung Grien)' },
  technique: 'Woodcuts',
  medium: 'Chiaroscuro woodcut in two blocks, printed in gray and black',
});
const shield = work('shield-with-greyhound-held-by-wild-man', 1480, {
  title: 'Shield with Greyhound Held by Wild Man',
  fullTitle: 'Shield with Greyhound Held by Wild Man',
  artist: { name: 'Martin Schongauer' },
});
const knight = work('knight-death-and-the-devil', 1513, {
  title: 'Knight, Death, and the Devil',
  fullTitle: 'Knight, Death, and the Devil',
});
const anonymous = work('a-wave', 1500, {
  title: 'Untitled',
  fullTitle: 'Untitled',
  artist: null,
  technique: null,
  medium: 'A wave engraved in copper',
  culture: null,
});

const catalogue = [listedFrom(greatWave, 1830), listedFrom(melencolia, 1514)];
const found = (query: string, works = catalogue, typing = false) =>
  searchWorks(works, query, 'en-US', { typing }).map(({ slug }) => slug);

describe('queryFrom', () => {
  it('reads q, trimmed and cut to its longest', () => {
    expect(queryFrom({ q: '  Hokusai ' })).toBe('Hokusai');
    expect(queryFrom({ q: 'x'.repeat(MAX_QUERY + 20) })).toHaveLength(MAX_QUERY);
  });

  it('reads nothing from a missing or repeated q', () => {
    expect(queryFrom({})).toBe('');
    expect(queryFrom({ q: ['a', 'b'] })).toBe('');
  });
});

describe('fold', () => {
  it('sets accents and case aside', () => {
    expect(fold('Dürer ÉTCHING Ōhashi')).toBe('durer etching ohashi');
  });
});

describe('wordsOf', () => {
  it('splits a text into its folded words, punctuation set aside', () => {
    expect(wordsOf('Hokusai’s Great Wave (ca. 1831)')).toEqual([
      'hokusai',
      's',
      'great',
      'wave',
      'ca',
      '1831',
    ]);
    expect(wordsOf(' — ')).toEqual([]);
  });
});

describe('withinEdits', () => {
  it('counts a letter changed, added or dropped as one edit', () => {
    expect(withinEdits('melencolia', 'melencolia', 0)).toBe(true);
    expect(withinEdits('melancolia', 'melencolia', 0)).toBe(false);
    expect(withinEdits('melancolia', 'melencolia', 1)).toBe(true);
    expect(withinEdits('etching', 'etchng', 1)).toBe(true);
    expect(withinEdits('etchng', 'etching', 1)).toBe(true);
    expect(withinEdits('rembrant', 'rembrandt', 1)).toBe(true);
  });

  it('counts two neighbours swapped as one edit, as a hurried hand types them', () => {
    expect(withinEdits('hokusia', 'hokusai', 1)).toBe(true);
    expect(withinEdits('ab', 'ba', 1)).toBe(true);
  });

  it('refuses a word more edits away than allowed', () => {
    expect(withinEdits('monet', 'mount', 1)).toBe(false);
    expect(withinEdits('monet', 'mount', 2)).toBe(true);
    expect(withinEdits('wave', '', 2)).toBe(false);
    expect(withinEdits('', 'wave', 4)).toBe(true);
    expect(withinEdits('abc', 'cab', 1)).toBe(false);
    expect(withinEdits('ab', '', 1)).toBe(false);
  });
});

describe('typosAllowed', () => {
  it('lets a longer word carry more typos, and a short one none', () => {
    expect([3, 4, 7, 8, 12].map(typosAllowed)).toEqual([0, 1, 1, 2, 2]);
  });
});

describe('searchWorks', () => {
  it("finds a work by its maker, without the maker's accents", () => {
    expect(found('durer')).toEqual(['melencolia-i']);
    expect(found('Albrecht Dürer')).toEqual(['melencolia-i']);
  });

  it('finds by title, medium, technique and culture, every word at once', () => {
    expect(found('great wave kanagawa')).toEqual(['under-the-wave-off-kanagawa']);
    expect(found('engraving')).toEqual(['melencolia-i']);
    expect(found('woodblock prints')).toEqual(['under-the-wave-off-kanagawa']);
    expect(found('japan')).toEqual(['under-the-wave-off-kanagawa']);
    expect(found('japan engraving')).toEqual([]);
  });

  it('finds a word by its start', () => {
    expect(found('dur')).toEqual(['melencolia-i']);
    expect(found('kanag hok')).toEqual(['under-the-wave-off-kanagawa']);
  });

  it('forgives a typo in a word no record holds', () => {
    expect(found('melancolia')).toEqual(['melencolia-i']);
    expect(found('hokusia')).toEqual(['under-the-wave-off-kanagawa']);
    expect(found('kanagwa')).toEqual(['under-the-wave-off-kanagawa']);
  });

  it('forgives none in a short word, or in the first letter', () => {
    expect(found('wve')).toEqual([]);
    expect(found('nelencolia')).toEqual([]);
    expect(found('monet')).toEqual([]);
  });

  it('takes a word a record holds as meant, so "witch" finds witches, not every "with"', () => {
    expect(found('witch', [witches, shield])).toEqual(['the-witches']);
  });

  it('reads the last word of a search being typed as a start, a typo in it included', () => {
    expect(found('melanc')).toEqual([]);
    expect(found('melanc', catalogue, true)).toEqual(['melencolia-i']);
    // Five letters are too few to tell a slip from another word.
    expect(found('melan', catalogue, true)).toEqual([]);
    // Only the last word is still being typed.
    expect(found('melanc engraving', catalogue, true)).toEqual([]);
  });

  it('puts the closest first: a title before a medium, then the oldest', () => {
    expect(found('wave', [anonymous, listedFrom(greatWave, 1830)])).toEqual([
      'under-the-wave-off-kanagawa',
      'a-wave',
    ]);
    expect(found('albrecht', [listedFrom(melencolia, 1514), knight])).toEqual([
      'knight-death-and-the-devil',
      'melencolia-i',
    ]);
  });

  it('finds a work its record says little of by what it does say', () => {
    const bare = work('untitled', 1600, {
      title: 'Untitled',
      fullTitle: 'Untitled',
      artist: null,
      technique: null,
      medium: null,
      culture: null,
    });
    expect(found('untitled', [bare])).toEqual(['untitled']);
  });

  it('finds nothing for nothing searched', () => {
    expect(found('   ')).toEqual([]);
    expect(found('?!')).toEqual([]);
  });
});
