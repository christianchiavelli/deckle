import { describe, expect, it } from 'vitest';
import { copy } from '../copy';
import { greatWave, listedFrom, melencolia, optionsFor } from '../test/works';
import {
  centuryOf,
  choiceFrom,
  filterGroupsOf,
  hrefOf,
  isChosen,
  NO_CHOICE,
  ordinal,
  shownOf,
  slugOf,
  type ListedWork,
} from './listing';

/** A work from the real records, its scan deciding the sizes it sells at. */
const work = (
  slug: string,
  year: number | null,
  technique: string | null,
  scan: { width: number; height: number },
): ListedWork => ({
  ...listedFrom(melencolia, year),
  slug,
  title: slug,
  technique,
  sizes: optionsFor(scan).map(({ size, available }) => ({ size, available })),
});

// Melencolia and the Wave print to A3; the Knight stops at A4; Mill River reaches A2.
const catalogue: ListedWork[] = [
  listedFrom(greatWave, 1830),
  work('knight-death-and-the-devil', 1513, 'Engravings', { width: 1566, height: 2006 }),
  listedFrom(melencolia, 1514),
  work('mill-river-scenery', 1857, 'Lithographs', { width: 3335, height: 3859 }),
  work('undated', null, null, { width: 2820, height: 3561 }),
];

const locale = copy.locale;

describe('slugOf', () => {
  it('spells a name as commerce spells its slugs', () => {
    expect(slugOf('Woodblock prints')).toBe('woodblock-prints');
    expect(slugOf(' Dürer & co. ')).toBe('durer-co');
  });
});

describe('centuryOf', () => {
  it.each([
    [1500, 15],
    [1501, 16],
    [1514, 16],
    [1900, 19],
    [1901, 20],
  ])('puts %i in century %i', (year, century) => {
    expect(centuryOf(year)).toBe(century);
  });
});

describe('ordinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [16, '16th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [111, '111th'],
  ])('names %i the %s', (n, name) => {
    expect(ordinal(n)).toBe(name);
  });
});

describe('choiceFrom', () => {
  it('reads a technique, a century and a size the catalogue has', () => {
    expect(
      choiceFrom({ technique: 'engravings', century: '16th-century', size: 'a3' }, catalogue),
    ).toEqual({ technique: 'Engravings', century: 16, size: 'A3' });
  });

  it('makes no choice of a value no work has, a misspelt one, or a repeated one', () => {
    expect(
      choiceFrom({ technique: 'etchings', century: '20th-century', size: 'a1' }, catalogue),
    ).toEqual(NO_CHOICE);
    expect(choiceFrom({ century: 'sixteenth', size: ['a3', 'a2'] }, catalogue)).toEqual(NO_CHOICE);
    expect(choiceFrom({}, catalogue)).toEqual(NO_CHOICE);
  });
});

describe('hrefOf', () => {
  it('writes the address of a choice, and the bare page for none', () => {
    expect(hrefOf(NO_CHOICE)).toBe('/prints');
    expect(hrefOf({ technique: 'Woodblock prints', century: 19, size: 'A2' })).toBe(
      '/prints?technique=woodblock-prints&century=19th-century&size=a2',
    );
  });

  it('is read back as the same choice', () => {
    const choice = { technique: 'Lithographs', century: 19, size: 'A2' } as const;
    const query = Object.fromEntries(new URL(hrefOf(choice), 'http://x').searchParams);
    expect(choiceFrom(query, catalogue)).toEqual(choice);
  });
});

describe('shownOf', () => {
  it('lists every work oldest first, an undated one last', () => {
    expect(shownOf(catalogue, NO_CHOICE, locale).map((entry) => entry.slug)).toEqual([
      'knight-death-and-the-devil',
      'melencolia-i',
      'under-the-wave-off-kanagawa',
      'mill-river-scenery',
      'undated',
    ]);
  });

  it('orders works of one year by title', () => {
    const sameYear = [
      work('b', 1514, null, { width: 2820, height: 3561 }),
      work('a', 1514, null, { width: 2820, height: 3561 }),
    ];
    expect(shownOf(sameYear, NO_CHOICE, locale).map((entry) => entry.slug)).toEqual(['a', 'b']);
  });

  it('orders undated works by title, after the dated ones', () => {
    const scan = { width: 2820, height: 3561 };
    const undated = [
      work('d', null, null, scan),
      work('c', null, null, scan),
      work('e', 1600, null, scan),
    ];
    expect(shownOf(undated, NO_CHOICE, locale).map((entry) => entry.slug)).toEqual(['e', 'c', 'd']);
  });

  it('keeps the works every choice allows', () => {
    const slugs = (choice: Parameters<typeof shownOf>[1]) =>
      shownOf(catalogue, choice, locale).map((entry) => entry.slug);
    expect(slugs({ ...NO_CHOICE, technique: 'Engravings' })).toEqual([
      'knight-death-and-the-devil',
      'melencolia-i',
    ]);
    expect(slugs({ ...NO_CHOICE, century: 19 })).toEqual([
      'under-the-wave-off-kanagawa',
      'mill-river-scenery',
    ]);
    expect(slugs({ ...NO_CHOICE, size: 'A3' })).toEqual([
      'melencolia-i',
      'under-the-wave-off-kanagawa',
      'mill-river-scenery',
      'undated',
    ]);
    expect(slugs({ technique: 'Engravings', century: 16, size: 'A2' })).toEqual([]);
  });
});

describe('filterGroupsOf', () => {
  const groups = (choice: Parameters<typeof filterGroupsOf>[1]) =>
    filterGroupsOf(catalogue, choice, copy).map((group) => ({
      label: group.label,
      options: group.options.map(
        (option) =>
          `${option.current ? '*' : ''}${option.label}${option.count === undefined ? '' : ` ${String(option.count)}`}`,
      ),
    }));

  it('offers every value with how many works it shows, the most first', () => {
    expect(groups(NO_CHOICE)).toEqual([
      {
        label: 'Technique',
        options: ['*All', 'Engravings 2', 'Lithographs 1', 'Woodblock prints 1'],
      },
      { label: 'Century', options: ['*All', '16th 2', '19th 2'] },
      { label: 'Printed at', options: ['*Any size', 'A3 and up 4', 'A2 and up 1'] },
    ]);
  });

  it("counts each group's options within the other groups' choices, leaving out what shows nothing", () => {
    expect(groups({ ...NO_CHOICE, century: 19 })).toEqual([
      { label: 'Technique', options: ['*All', 'Lithographs 1', 'Woodblock prints 1'] },
      { label: 'Century', options: ['All', '16th 2', '*19th 2'] },
      { label: 'Printed at', options: ['*Any size', 'A3 and up 2', 'A2 and up 1'] },
    ]);
  });

  it('keeps the choice in force even where it shows nothing', () => {
    const [, , sizes] = filterGroupsOf(
      catalogue,
      { technique: 'Engravings', century: 16, size: 'A2' },
      copy,
    );
    expect(sizes?.options.map((option) => [option.label, option.count, option.current])).toEqual([
      ['Any size', undefined, false],
      ['A3 and up', 1, false],
      ['A2 and up', 0, true],
    ]);
  });

  it('links each option to the page with that choice made and the others kept', () => {
    const [technique] = filterGroupsOf(catalogue, { ...NO_CHOICE, size: 'A3' }, copy);
    expect(technique?.options.map((option) => option.href)).toEqual([
      '/prints?size=a3',
      '/prints?technique=engravings&size=a3',
      '/prints?technique=lithographs&size=a3',
      '/prints?technique=woodblock-prints&size=a3',
    ]);
  });
});

describe('isChosen', () => {
  it('says whether any group has a choice', () => {
    expect(isChosen(NO_CHOICE)).toBe(false);
    expect(isChosen({ ...NO_CHOICE, size: 'A2' })).toBe(true);
  });
});
