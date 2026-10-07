/** A run of a suggestion's text, marked where it holds what was typed. */
export interface Run {
  readonly text: string;
  readonly marked: boolean;
}

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const WORD_CHARACTER = /[\p{L}\p{N}]/u;
const GRAPHEMES = new Intl.Segmenter('en', { granularity: 'grapheme' });

/**
 * The text in runs, with the opening of each word that a typed word starts
 * marked, accents and case set aside: "dür alb" marks "Alb" and "Dür" in
 * "Albrecht Dürer". A match found through a typo has nothing to mark.
 */
export function markStarts(text: string, query: string): Run[] {
  const typed = fold(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  // Each character is folded alone, so a match in the folded text maps back
  // to the characters it covers, "ü" to "ü" and not to "u" and its accent.
  const characters = Array.from(GRAPHEMES.segment(text), ({ segment }) => segment);
  let folded = '';
  const owners: number[] = [];
  for (const [index, character] of characters.entries()) {
    const alone = fold(character);
    folded += alone;
    owners.push(...Array.from({ length: alone.length }, () => index));
  }
  const marked = new Set<number>();
  for (let at = 0; at < folded.length; at++) {
    const opensWord = at === 0 || !WORD_CHARACTER.test(folded.charAt(at - 1));
    const word = opensWord
      ? typed.find((candidate) => folded.startsWith(candidate, at))
      : undefined;
    for (const owner of word ? owners.slice(at, at + word.length) : []) {
      marked.add(owner);
    }
  }
  const runs: Run[] = [];
  for (const [index, character] of characters.entries()) {
    const last = runs.at(-1);
    if (last?.marked === marked.has(index)) {
      runs[runs.length - 1] = { text: last.text + character, marked: last.marked };
    } else {
      runs.push({ text: character, marked: marked.has(index) });
    }
  }
  return runs;
}
