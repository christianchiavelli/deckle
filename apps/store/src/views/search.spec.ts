import { describe, expect, it } from 'vitest';
import { greatWave, listedFrom, melencolia } from '../test/works';
import { fold, MAX_QUERY, queryFrom, searchWorks } from './search';

const catalogue = [listedFrom(greatWave, 1830), listedFrom(melencolia, 1514)];
const found = (query: string) => searchWorks(catalogue, query, 'en-US').map((work) => work.slug);

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

describe('searchWorks', () => {
  it("finds a work by its maker, without the maker's accents", () => {
    expect(found('durer')).toEqual(['melencolia-i']);
    expect(found('Albrecht Dürer')).toEqual(['melencolia-i']);
  });

  it('finds by title, medium, technique and culture, every word at once', () => {
    expect(found('wave kanagawa')).toEqual(['under-the-wave-off-kanagawa']);
    expect(found('engraving')).toEqual(['melencolia-i']);
    expect(found('woodblock prints')).toEqual(['under-the-wave-off-kanagawa']);
    expect(found('japan')).toEqual(['under-the-wave-off-kanagawa']);
    expect(found('japan engraving')).toEqual([]);
  });

  it('lists what it finds oldest first, and nothing for nothing searched', () => {
    expect(found('e')).toEqual(['melencolia-i', 'under-the-wave-off-kanagawa']);
    expect(found('   ')).toEqual([]);
  });
});
