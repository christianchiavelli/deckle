import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor, InvalidCursorError, pageWindow } from './cursor.js';

describe('cursors', () => {
  it('round-trip a position without showing it as a bare number', () => {
    const cursor = encodeCursor(17);

    expect(cursor).not.toContain('17');
    expect(cursor).toMatch(/^[\w-]+$/);
    expect(decodeCursor(cursor)).toBe(17);
  });

  it.each([
    ['garbage', 'not a cursor at all'],
    ['another prefix', Buffer.from('artwork:v0:3').toString('base64url')],
    ['a negative position', Buffer.from('artwork:v1:-1').toString('base64url')],
    ['a position past any catalogue', Buffer.from('artwork:v1:999999').toString('base64url')],
    ['an empty string', ''],
  ])('refuse %s', (_case, cursor) => {
    expect(() => decodeCursor(cursor)).toThrow(InvalidCursorError);
  });

  it('turn into the slice after the item they point at', () => {
    expect(pageWindow(24, null)).toEqual({ skip: 0, take: 24 });
    expect(pageWindow(2, encodeCursor(1))).toEqual({ skip: 2, take: 2 });
  });
});
