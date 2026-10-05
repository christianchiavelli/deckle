import type { Artist, Work } from '../catalog.js';
import { MetResponseError } from './errors.js';
import type { MetObject } from './met-object.js';

/** A work as The Met describes it: everything in `Work` but what Deckle adds (slug, short title, image). */
export type WorkRecord = Omit<Work, 'slug' | 'shortTitle' | 'image'>;

/** The Met's empty string, or text that is only spaces, becomes `null`. */
export function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** A year written as text ("1471", "-900"), or `null` for anything else, "" included. */
export function yearOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d{1,5}$/.test(trimmed)) return null;
  const year = Number(trimmed);
  return year >= -10000 && year <= 2100 ? year : null;
}

/** One entry per line: The Met separates the plate, the sheet and the rest with CRLF. */
export function dimensionLines(value: string): string[] {
  return value
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** "n.d." is the catalogue's way of saying there is no date, so it reads as one that is missing. */
function displayDate(value: string): string | null {
  const display = orNull(value);
  return display?.toLowerCase() === 'n.d.' ? null : display;
}

function artistOf(raw: MetObject): Artist | null {
  const name = orNull(raw.artistDisplayName);
  if (name === null) return null;
  return {
    name,
    bio: orNull(raw.artistDisplayBio),
    nationality: orNull(raw.artistNationality),
    beginYear: yearOrNull(raw.artistBeginDate),
    endYear: yearOrNull(raw.artistEndDate),
  };
}

export function normaliseObject(raw: MetObject): WorkRecord {
  const title = orNull(raw.title);
  const objectUrl = orNull(raw.objectURL);
  if (title === null || objectUrl === null) {
    throw new MetResponseError(
      objectUrl ?? `object ${raw.objectID}`,
      `object ${raw.objectID} has no ${title === null ? 'title' : 'object URL'}`,
    );
  }
  // Every record carries integer years; both at zero with no date to show is
  // how a record without any date would read, so that is kept apart from 0 CE.
  const undated =
    raw.objectBeginDate === 0 && raw.objectEndDate === 0 && orNull(raw.objectDate) === null;

  return {
    objectId: raw.objectID,
    title,
    artist: artistOf(raw),
    date: {
      display: displayDate(raw.objectDate),
      beginYear: undated ? null : raw.objectBeginDate,
      endYear: undated ? null : raw.objectEndDate,
    },
    medium: orNull(raw.medium),
    dimensions: dimensionLines(raw.dimensions),
    classification: orNull(raw.classification),
    department: orNull(raw.department),
    culture: orNull(raw.culture),
    period: orNull(raw.period),
    creditLine: orNull(raw.creditLine),
    accessionNumber: orNull(raw.accessionNumber),
    objectUrl,
    tags: [
      ...new Set((raw.tags ?? []).map((tag) => tag.term.trim()).filter((term) => term !== '')),
    ],
  };
}
