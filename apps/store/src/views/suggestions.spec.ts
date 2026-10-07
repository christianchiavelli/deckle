import { describe, expect, it } from 'vitest';
import { copy } from '../copy';
import { greatWave, listedFrom, melencolia } from '../test/works';
import type { Suggestions } from './search';
import { suggestionListOf } from './suggestions';

const wave = listedFrom(greatWave, 1830);
const engraving = listedFrom(melencolia, 1514);

describe('suggestionListOf', () => {
  it('lists makers, then techniques, then works, each leading to its page', () => {
    const suggestions: Suggestions = {
      artists: [{ name: 'Albrecht Dürer', count: 4 }],
      techniques: [{ name: 'Woodblock prints', count: 1 }],
      works: [engraving],
      total: 4,
    };
    const list = suggestionListOf(suggestions, 'Dür', copy);

    expect(list.groups).toEqual([
      {
        label: 'Artists',
        suggestions: [
          { href: '/search?q=Albrecht%20D%C3%BCrer', label: 'Albrecht Dürer', count: '4 prints' },
        ],
      },
      {
        label: 'Techniques',
        suggestions: [
          {
            href: '/prints?technique=woodblock-prints',
            label: 'Woodblock prints',
            count: '1 print',
          },
        ],
      },
      {
        label: 'Prints',
        suggestions: [
          {
            href: '/prints/melencolia-i',
            label: 'Melencolia I',
            detail: 'Albrecht Dürer, 1514',
            image: {
              src: 'http://localhost:8080/assets/source/melencolia-i.webp?preset=thumb&format=webp',
              width: 1901,
              height: 2400,
            },
          },
        ],
      },
    ]);
    expect(list.all).toEqual({ href: '/search?q=D%C3%BCr', label: 'All 4 prints for “Dür”' });
    expect(list.status).toBe('1 artist, 1 technique, and 1 print');
  });

  it('leaves out the groups with nothing in them, and a picture a work does not have', () => {
    const list = suggestionListOf(
      { artists: [], techniques: [], works: [{ ...wave, image: null }], total: 1 },
      'wave',
      copy,
    );
    expect(list.groups.map(({ label }) => label)).toEqual(['Prints']);
    expect(list.groups[0]?.suggestions[0]).not.toHaveProperty('image');
    expect(list.all?.label).toBe('1 print for “wave”');
    expect(list.status).toBe('1 print');
  });

  it('says so when nothing matches', () => {
    const list = suggestionListOf(
      { artists: [], techniques: [], works: [], total: 0 },
      'monet',
      copy,
    );
    expect(list.groups).toEqual([]);
    expect(list.all).toBeNull();
    expect(list.none).toBe('No prints, artists or techniques match “monet”');
    expect(list.status).toBe(list.none);
  });
});
