import type { Copy } from '../copy';
import type { ListedWorkFragment } from '../gateway/generated';

/**
 * The prints page: every work, narrowed by technique, century and the size a
 * buyer wants, oldest first. The whole catalogue is one cached read of 48
 * works, so the choices are worked out here rather than asked of the gateway
 * (ADR 0043).
 */

export type ListedWork = ListedWorkFragment;

/** The sizes a buyer can ask for at least: A4 is every work, and none reaches A1. */
export const SIZE_CHOICES = ['A3', 'A2'] as const;
export type SizeChoice = (typeof SIZE_CHOICES)[number];

const SIZE_ORDER = ['A4', 'A3', 'A2', 'A1'];

export interface Choice {
  /** A technique family as commerce names it, such as "Etchings". */
  readonly technique: string | null;
  /** The century's number: 16 for the 16th. */
  readonly century: number | null;
  readonly size: SizeChoice | null;
}

export const NO_CHOICE: Choice = { technique: null, century: null, size: null };

/** Lower-case words joined by hyphens, as commerce spells its slugs: "woodblock-prints". */
export function slugOf(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The century a year falls in: 1501 to 1600 are the 16th, as commerce groups them. */
export function centuryOf(year: number): number {
  return Math.floor((Math.max(year, 1) - 1) / 100) + 1;
}

/** "16th", "21st", "22nd": the English ordinal, which the addresses use in every language. */
export function ordinal(n: number): string {
  const tens = n % 100;
  const units = n % 10;
  const suffix =
    tens >= 11 && tens <= 13
      ? 'th'
      : units === 1
        ? 'st'
        : units === 2
          ? 'nd'
          : units === 3
            ? 'rd'
            : 'th';
  return `${String(n)}${suffix}`;
}

/** Where a work's largest size for sale stands among the paper sizes; -1 when none is. */
function largestOf(work: ListedWork): number {
  return Math.max(
    -1,
    ...work.sizes.filter((size) => size.available).map((size) => SIZE_ORDER.indexOf(size.size)),
  );
}

const reaches = (work: ListedWork, size: SizeChoice) => largestOf(work) >= SIZE_ORDER.indexOf(size);

type Params = Readonly<Record<string, string | string[] | undefined>>;

const single = (value: string | string[] | undefined) =>
  typeof value === 'string' ? value : undefined;

/**
 * The choice an address makes, from its query: `technique=etchings`,
 * `century=18th-century`, `size=a3`. A value no work has is no choice at all,
 * so an old or mistyped address still shows every print.
 */
export function choiceFrom(params: Params, works: readonly ListedWork[]): Choice {
  const technique = single(params['technique']);
  const century = /^(\d{1,2})(?:st|nd|rd|th)-century$/.exec(single(params['century']) ?? '');
  const size = single(params['size'])?.toUpperCase();
  const centuryNumber = century?.[1] === undefined ? null : Number(century[1]);
  return {
    technique:
      works.find((work) => work.technique !== null && slugOf(work.technique) === technique)
        ?.technique ?? null,
    century:
      centuryNumber !== null &&
      works.some((work) => work.year !== null && centuryOf(work.year) === centuryNumber)
        ? centuryNumber
        : null,
    size: SIZE_CHOICES.find((choice) => choice === size) ?? null,
  };
}

/** Whether the choice keeps a work. */
export function matches(work: ListedWork, { technique, century, size }: Choice): boolean {
  return (
    (technique === null || work.technique === technique) &&
    (century === null || (work.year !== null && centuryOf(work.year) === century)) &&
    (size === null || reaches(work, size))
  );
}

/** The address of a choice. */
export function hrefOf({ technique, century, size }: Choice): string {
  const query = new URLSearchParams();
  if (technique !== null) query.set('technique', slugOf(technique));
  if (century !== null) query.set('century', `${ordinal(century)}-century`);
  if (size !== null) query.set('size', size.toLowerCase());
  const search = query.toString();
  return search === '' ? '/prints' : `/prints?${search}`;
}

/** Oldest first, then by title: the catalogue reads as a short history of the print. */
export function inOrder(works: readonly ListedWork[], locale: string): ListedWork[] {
  return [...works].sort(
    (a, b) =>
      (a.year ?? Number.POSITIVE_INFINITY) - (b.year ?? Number.POSITIVE_INFINITY) ||
      a.title.localeCompare(b.title, locale),
  );
}

/** The works a choice keeps, in order. */
export function shownOf(
  works: readonly ListedWork[],
  choice: Choice,
  locale: string,
): ListedWork[] {
  return inOrder(
    works.filter((work) => matches(work, choice)),
    locale,
  );
}

export interface FilterOption {
  readonly label: string;
  readonly href: string;
  readonly count?: number;
  readonly current: boolean;
}

export interface FilterGroup {
  readonly label: string;
  readonly options: readonly FilterOption[];
}

/**
 * The three groups of choices. Each option counts the works the other groups'
 * choices leave, so a count is what a click shows; an option that would show
 * nothing is left out, unless it is the one in force.
 */
export function filterGroupsOf(
  works: readonly ListedWork[],
  choice: Choice,
  copy: Copy,
): FilterGroup[] {
  const text = copy.prints;
  const without = (key: keyof Choice) =>
    works.filter((work) => matches(work, { ...choice, [key]: null }));
  const counted = (options: (FilterOption & { readonly count: number })[]) =>
    options.filter((option) => option.current || option.count > 0);

  const forTechnique = without('technique');
  const techniques = [
    ...new Set(forTechnique.flatMap((work) => (work.technique === null ? [] : [work.technique]))),
  ].map((technique) => ({
    label: technique,
    href: hrefOf({ ...choice, technique }),
    count: forTechnique.filter((work) => work.technique === technique).length,
    current: choice.technique === technique,
  }));
  techniques.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, copy.locale));

  const forCentury = without('century');
  const centuries = [
    ...new Set(forCentury.flatMap((work) => (work.year === null ? [] : [centuryOf(work.year)]))),
  ]
    .sort((a, b) => a - b)
    .map((century) => ({
      label: text.century(century),
      href: hrefOf({ ...choice, century }),
      count: forCentury.filter((work) => work.year !== null && centuryOf(work.year) === century)
        .length,
      current: choice.century === century,
    }));

  const forSize = without('size');
  const sizes = SIZE_CHOICES.map((size) => ({
    label: text.sizeAndUp(size),
    href: hrefOf({ ...choice, size }),
    count: forSize.filter((work) => reaches(work, size)).length,
    current: choice.size === size,
  }));

  const all = (key: keyof Choice, label: string): FilterOption => ({
    label,
    href: hrefOf({ ...choice, [key]: null }),
    current: choice[key] === null,
  });

  return [
    { label: text.technique, options: [all('technique', text.all), ...counted(techniques)] },
    { label: text.centuryGroup, options: [all('century', text.all), ...counted(centuries)] },
    { label: text.printedAt, options: [all('size', text.anySize), ...counted(sizes)] },
  ];
}

/** Whether anything is chosen, for the line that offers to clear it. */
export const isChosen = (choice: Choice) =>
  choice.technique !== null || choice.century !== null || choice.size !== null;
