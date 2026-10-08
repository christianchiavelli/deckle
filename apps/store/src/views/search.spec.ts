import { describe, expect, it } from 'vitest';
import { greatWave, listedFrom, melencolia } from '../test/works';
import type { ListedWork } from './listing';
import {
  fold,
  MAX_QUERY,
  queryFrom,
  searchWorks,
  SUGGESTED,
  suggestionsOf,
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
const found = (query: string, works = catalogue) =>
  searchWorks(works, query, 'en-US').map(({ slug }) => slug);

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

  it('reads the last word as one still being typed: a start, a typo in it included', () => {
    expect(found('melanc')).toEqual(['melencolia-i']);
    // Five letters are too few to tell a slip from another word.
    expect(found('melan')).toEqual([]);
    // Only the last word may be unfinished.
    expect(found('melanc engraving')).toEqual([]);
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

describe('suggestionsOf', () => {
  const rhinoceros = work('the-rhinoceros', 1515, {
    title: 'The Rhinoceros',
    fullTitle: 'The Rhinoceros',
    technique: 'Woodcuts',
    medium: 'Woodcut',
  });
  const shop = [
    listedFrom(melencolia, 1514),
    knight,
    rhinoceros,
    witches,
    shield,
    anonymous,
    listedFrom(greatWave, 1830),
  ];
  const suggest = (query: string, works = shop) => suggestionsOf(works, query, 'en-US');

  it('suggests the makers whose name holds what was typed, with how many works each has', () => {
    const { artists, works, total } = suggest('dür');
    expect(artists).toEqual([{ name: 'Albrecht Dürer', count: 3 }]);
    expect(works.map(({ slug }) => slug)).toEqual([
      'knight-death-and-the-devil',
      'melencolia-i',
      'the-rhinoceros',
    ]);
    expect(total).toBe(3);
  });

  it('suggests a technique by its start, the ones with the most works first', () => {
    expect(suggest('wood').techniques).toEqual([
      { name: 'Woodcuts', count: 2 },
      { name: 'Woodblock prints', count: 1 },
    ]);
    expect(suggest('engr').techniques).toEqual([{ name: 'Engravings', count: 3 }]);
  });

  it('puts a whole name before a start, and ties in alphabetical order', () => {
    const twin = work('twin', 1600, { artist: { name: 'Hans Wechtlin' } });
    expect(suggest('hans', [twin, witches]).artists.map(({ name }) => name)).toEqual([
      'Hans Baldung (called Hans Baldung Grien)',
      'Hans Wechtlin',
    ]);
  });

  it('lists at most five works, three makers and two techniques, and counts every work', () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      work(`etching-${String(index)}`, 1600 + index, {
        artist: { name: `Etcher ${String(index)}` },
        technique:
          index % 3 === 0 ? 'Etchings' : index % 3 === 1 ? 'Etched plates' : 'Etched glass',
      }),
    );
    const { works, artists, techniques, total } = suggest('etch', many);
    expect(works).toHaveLength(SUGGESTED.works);
    expect(artists).toHaveLength(SUGGESTED.artists);
    expect(techniques).toHaveLength(SUGGESTED.techniques);
    expect(total).toBe(8);
  });

  it('suggests nothing for nothing typed, or for what no record holds', () => {
    expect(suggest('  ')).toEqual({ works: [], artists: [], techniques: [], total: 0 });
    expect(suggest('monet')).toEqual({ works: [], artists: [], techniques: [], total: 0 });
  });
});

describe("a technique in the edition's words", () => {
  const rhinoceros = work('the-rhinoceros', 1515, {
    title: 'The Rhinoceros',
    fullTitle: 'The Rhinoceros',
    technique: 'Woodcuts',
    medium: 'Woodcut',
  });
  const shop = [listedFrom(melencolia, 1514), rhinoceros, witches];
  const inPortuguese = (technique: string) =>
    technique === 'Woodcuts' ? 'Xilogravuras' : technique;

  it('finds the works of a technique by its name in the edition, accents aside', () => {
    expect(searchWorks(shop, 'xilogravura', 'pt-BR', inPortuguese).map(({ slug }) => slug)).toEqual(
      ['the-witches', 'the-rhinoceros'],
    );
    expect(searchWorks(shop, 'xilogravura', 'en-US')).toEqual([]);
  });

  it('suggests the technique by that name too', () => {
    expect(suggestionsOf(shop, 'xilo', 'pt-BR', inPortuguese).techniques).toEqual([
      { name: 'Woodcuts', count: 2 },
    ]);
  });
});
