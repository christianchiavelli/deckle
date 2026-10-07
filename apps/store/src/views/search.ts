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
  /** The word is the last of a search still being typed, so it may be only a start. */
  readonly typing: boolean;
}

function matchOf(searched: string, word: string, { typo, typing }: Reading): number {
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
  return typing &&
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

export interface SearchOptions {
  /** The search is being typed, so its last word may be only the start of one. */
  readonly typing?: boolean;
}

/**
 * The works whose title, maker, technique, medium or culture hold every word
 * searched for, as a whole word, as a word's start, or, for a word no record
 * holds, with a typo in it: "rembr" and "melancolia" both find what they
 * meant, and "witch" finds the witches, not every "with". The closest come
 * first: a whole word before a start, a start before a typo, a title or a
 * maker before a medium; then the oldest. Nothing searched for finds nothing.
 */
export function searchWorks(
  works: readonly ListedWork[],
  query: string,
  locale: string,
  { typing = false }: SearchOptions = {},
): ListedWork[] {
  const words = wordsOf(query);
  if (words.length === 0) {
    return [];
  }
  const records = inOrder(works, locale).map((work) => ({ work, fields: fieldsOf(work) }));
  const vocabulary = [
    ...new Set(records.flatMap(({ fields }) => fields.flatMap((field) => field.words))),
  ];
  const searched = words.map((word, index) => ({
    word,
    reading: {
      typo: !vocabulary.some((known) => known.startsWith(word)),
      typing: typing && index === words.length - 1,
    },
  }));
  return (
    records
      .map(({ work, fields }) => ({ work, score: scoreOf(fields, searched) }))
      .filter(({ score }) => score > 0)
      // The sort is stable, so works that match as well stay oldest first.
      .sort((a, b) => b.score - a.score)
      .map(({ work }) => work)
  );
}
