import { describe, expect, it } from 'vitest';
import { morePrints } from './more';

const work = (slug: string, artist: string | null, department: string | null) => ({
  slug,
  artist: artist === null ? null : { name: artist },
  department,
});

const catalogue = [
  work('black-lion-wharf', 'Whistler', 'Drawings and Prints'),
  work('evening-snow-at-kanbara', 'Hiroshige', 'Asian Art'),
  work('knight-death-and-the-devil', 'Dürer', 'Drawings and Prints'),
  work('melencolia-i', 'Dürer', 'Drawings and Prints'),
  work('south-wind-clear-sky', 'Hokusai', 'Asian Art'),
  work('the-rhinoceros', 'Dürer', 'Drawings and Prints'),
  work('the-sleep-of-reason', 'Goya', 'Drawings and Prints'),
];

describe('morePrints', () => {
  it("picks the maker's other works first, then the department's, never the work itself", () => {
    expect(morePrints(work('melencolia-i', 'Dürer', 'Drawings and Prints'), catalogue)).toEqual([
      catalogue[2],
      catalogue[5],
      catalogue[0],
      catalogue[6],
    ]);
  });

  it('falls back on the rest of the catalogue, in its order', () => {
    const slugs = morePrints(work('the-great-wave', 'Hokusai', 'Asian Art'), catalogue, 3).map(
      (entry) => entry.slug,
    );
    expect(slugs).toEqual(['south-wind-clear-sky', 'evening-snow-at-kanbara', 'black-lion-wharf']);
  });

  it('matches nothing on a maker or a department the record does not give', () => {
    const anonymous = work('a-print', null, null);
    const withNulls = [...catalogue, work('another', null, null)];
    expect(morePrints(anonymous, withNulls, 2).map((entry) => entry.slug)).toEqual([
      'black-lion-wharf',
      'evening-snow-at-kanbara',
    ]);
  });
});
