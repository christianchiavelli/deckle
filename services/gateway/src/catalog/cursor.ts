/**
 * Cursors are opaque to clients but are positions in the ordered list underneath:
 * commerce pages by offset, so a cursor is the offset of an item. The version
 * prefix lets the encoding change later without old cursors being misread.
 */

const PREFIX = 'artwork:v1:';
/** Far beyond any catalogue this shop will hold; a bigger number is a forged cursor. */
const MAX_OFFSET = 100_000;

export class InvalidCursorError extends Error {
  override readonly name = 'InvalidCursorError';

  constructor() {
    super('The cursor is not one this API issued');
  }
}

export function encodeCursor(offset: number): string {
  return Buffer.from(`${PREFIX}${offset}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): number {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  const digits = decoded.startsWith(PREFIX) ? decoded.slice(PREFIX.length) : '';
  if (!/^\d{1,6}$/.test(digits)) throw new InvalidCursorError();
  const offset = Number(digits);
  if (offset > MAX_OFFSET) throw new InvalidCursorError();
  return offset;
}

export interface PageWindow {
  readonly skip: number;
  readonly take: number;
}

/** The slice of the list to read for `first` items after `after`. */
export function pageWindow(first: number, after: string | null | undefined): PageWindow {
  const skip = after === null || after === undefined ? 0 : decodeCursor(after) + 1;
  return { skip, take: first };
}
