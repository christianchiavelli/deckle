import { inOrder, type ListedWork } from './listing';

/** The longest search the page reads; anything past it is cut. */
export const MAX_QUERY = 100;

type Params = Readonly<Record<string, string | string[] | undefined>>;

/** What was searched for, from the address's `q`: trimmed, and cut to `MAX_QUERY`. */
export function queryFrom(params: Params): string {
  const value = params['q'];
  return typeof value === 'string' ? value.trim().slice(0, MAX_QUERY) : '';
}

/** Accents and case set aside, so "durer" finds Dürer and "ETCHING" an etching. */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** A text's words, folded: "Hokusai's Great Wave" is "hokusai", "s", "great" and "wave". */
export function wordsOf(value: string): string[] {
  return fold(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * Whether one word becomes the other in at most `edits` edits: a letter
 * changed, added or dropped, or two neighbours swapped, as a hurried hand
 * types them. It tries the four edits where the words first part, and a
 * search allows two at most, so a check is a few dozen comparisons.
 */
export function withinEdits(a: string, b: string, edits: number): boolean {
  if (a === b) {
    return true;
  }
  if (edits === 0) {
    return false;
  }
  // The words differ, so they part somewhere before the longer one ends.
  let shared = 0;
  while (a.charAt(shared) === b.charAt(shared)) {
    shared += 1;
  }
  const x = a.slice(shared);
  const y = b.slice(shared);
  const left = edits - 1;
  return (
    withinEdits(x.slice(1), y.slice(1), left) ||
    withinEdits(x.slice(1), y, left) ||
    withinEdits(x, y.slice(1), left) ||
    // Two letters swapped: x opens with y's first two, the other way round.
    (y.length > 1 &&
      x.startsWith(y.charAt(1) + y.charAt(0)) &&
      withinEdits(x.slice(2), y.slice(2), left))
  );
}

/**
 * The typos a searched word may carry and still match: none up to three
 * letters, where one changed letter makes another word, one up to seven, and
 * two from eight on.
 */
export function typosAllowed(length: number): number {
  return length < 4 ? 0 : length < 8 ? 1 : 2;
}

/** How a searched word meets a word of the record, best first. */
const WHOLE = 3;
const START = 2;
const TYPO = 1;
const NONE = 0;

/** The shortest start of a word that may carry a typo: "melanc" may, "monet" may not. */
const SHORTEST_START_WITH_TYPO = 6;

/** How a searched word may meet the record. */
interface Reading {
  /** No record holds the word, not even as a start, so it may be a typo. */
  readonly typo: boolean;
  /** The word is the search's last, which may still be being typed: only a start. */
  readonly last: boolean;
}

function matchOf(searched: string, word: string, { typo, last }: Reading): number {
  if (word === searched) {
    return WHOLE;
  }
  if (word.startsWith(searched)) {
    return START;
  }
  // A typo is seldom the first letter, and allowing one there matches words
  // that only rhyme.
  const allowed = typosAllowed(searched.length);
  if (!typo || allowed === 0 || !word.startsWith(searched.charAt(0))) {
    return NONE;
  }
  if (withinEdits(searched, word, allowed)) {
    return TYPO;
  }
  // A word still being typed is the start of one: "melanc" is on its way to
  // "melencolia", one letter off, give or take a letter dropped or doubled.
  const { length } = searched;
  return last &&
    length >= SHORTEST_START_WITH_TYPO &&
    [length - 1, length, length + 1].some(
      (cut) => cut < word.length && withinEdits(searched, word.slice(0, cut), 1),
    )
    ? TYPO
    : NONE;
}

/** What a search reads of a work, and how much a match there counts. */
interface Field {
  readonly words: readonly string[];
  readonly weight: number;
}

function fieldsOf(work: ListedWork): Field[] {
  return [
    { words: wordsOf(`${work.title} ${work.fullTitle}`), weight: 3 },
    { words: wordsOf(work.artist?.name ?? ''), weight: 3 },
    { words: wordsOf(work.technique ?? ''), weight: 2 },
    { words: wordsOf(work.medium ?? ''), weight: 1 },
    { words: wordsOf(work.culture ?? ''), weight: 1 },
  ];
}

interface Searched {
  readonly word: string;
  readonly reading: Reading;
}

/** How well the fields hold every searched word, each at its best match: 0 when one is missing. */
function scoreOf(fields: readonly Field[], searched: readonly Searched[]): number {
  let score = 0;
  for (const { word, reading } of searched) {
    let best = NONE;
    for (const field of fields) {
      for (const candidate of field.words) {
        best = Math.max(best, matchOf(word, candidate, reading) * field.weight);
      }
    }
    if (best === NONE) {
      return 0;
    }
    score += best;
  }
  return score;
}

/** A search read against a catalogue: each work's fields, and how each searched word may match. */
interface Search {
  readonly records: readonly { readonly work: ListedWork; readonly fields: readonly Field[] }[];
  readonly searched: readonly Searched[];
}

function searchOf(works: readonly ListedWork[], query: string, locale: string): Search | null {
  const words = wordsOf(query);
  if (words.length === 0) {
    return null;
  }
  const records = inOrder(works, locale).map((work) => ({ work, fields: fieldsOf(work) }));
  const vocabulary = [
    ...new Set(records.flatMap(({ fields }) => fields.flatMap((field) => field.words))),
  ];
  const searched = words.map((word, index) => ({
    word,
    reading: {
      typo: !vocabulary.some((known) => known.startsWith(word)),
      last: index === words.length - 1,
    },
  }));
  return { records, searched };
}

function ranked({ records, searched }: Search): ListedWork[] {
  return (
    records
      .map(({ work, fields }) => ({ work, score: scoreOf(fields, searched) }))
      .filter(({ score }) => score > 0)
      // The sort is stable, so works that match as well stay oldest first.
      .sort((a, b) => b.score - a.score)
      .map(({ work }) => work)
  );
}

/**
 * The works whose title, maker, technique, medium or culture hold every word
 * searched for, as a whole word, as a word's start, or, for a word no record
 * holds, with a typo in it: "rembr" and "melancolia" both find what they
 * meant, and "witch" finds the witches, not every "with". The last word may
 * still be being typed, so from six letters it may be a start with a typo in
 * it: "melanc" finds Melencolia. The closest come first: a whole word before a
 * start, a start before a typo, a title or a maker before a medium; then the
 * oldest. Nothing searched for finds nothing.
 */
export function searchWorks(
  works: readonly ListedWork[],
  query: string,
  locale: string,
): ListedWork[] {
  const search = searchOf(works, query, locale);
  return search ? ranked(search) : [];
}

/** A maker or a technique, and how many works the shop has of it. */
export interface Named {
  readonly name: string;
  readonly count: number;
}

/** The names whose words hold every searched word, closest first, then the most works. */
function namesOf(
  { records, searched }: Search,
  nameOf: (work: ListedWork) => string | null,
  locale: string,
): Named[] {
  const counts = new Map<string, number>();
  for (const { work } of records) {
    const name = nameOf(work);
    if (name) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([name, count]) => ({
      name,
      count,
      score: scoreOf([{ words: wordsOf(name), weight: 1 }], searched),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.count - a.count || a.name.localeCompare(b.name, locale))
    .map(({ name, count }) => ({ name, count }));
}

/** How many of each the field lists: a glance, with the search page a key away. */
export const SUGGESTED = { works: 5, artists: 3, techniques: 2 } as const;

export interface Suggestions {
  /** The closest works. */
  readonly works: readonly ListedWork[];
  /** The makers whose name holds what was typed. */
  readonly artists: readonly Named[];
  /** The technique families whose name holds it. */
  readonly techniques: readonly Named[];
  /** Every work the search page finds for it. */
  readonly total: number;
}

/**
 * What the search field suggests for what has been typed so far: the makers
 * and techniques whose names hold it, and the closest works, read as the
 * search page reads them, so the count it gives is the page's.
 */
export function suggestionsOf(
  works: readonly ListedWork[],
  query: string,
  locale: string,
): Suggestions {
  const search = searchOf(works, query, locale);
  if (!search) {
    return { works: [], artists: [], techniques: [], total: 0 };
  }
  const found = ranked(search);
  return {
    works: found.slice(0, SUGGESTED.works),
    artists: namesOf(search, (work) => work.artist?.name ?? null, locale).slice(
      0,
      SUGGESTED.artists,
    ),
    techniques: namesOf(search, (work) => work.technique, locale).slice(0, SUGGESTED.techniques),
    total: found.length,
  };
}
