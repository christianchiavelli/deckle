import { describe, expect, it } from 'vitest';
import { type Cbor, encodeCbor } from './cbor.ts';

const hex = (value: Cbor) =>
  Array.from(encodeCbor(value), (byte) => byte.toString(16).padStart(2, '0')).join('');

describe('encodeCbor', () => {
  // The examples are RFC 8949's own, from its Appendix A.
  it.each([
    [0, '00'],
    [23, '17'],
    [24, '1818'],
    [100, '1864'],
    [1000, '1903e8'],
    [1_000_000, '1a000f4240'],
    [-1, '20'],
    [-10, '29'],
    [-100, '3863'],
    [-1000, '3903e7'],
  ])('writes the integer %d as %s', (value, expected) => {
    expect(hex(value)).toBe(expected);
  });

  it('writes text as UTF-8 and bytes as they are', () => {
    expect(hex('')).toBe('60');
    expect(hex('IETF')).toBe('6449455446');
    expect(hex('ü')).toBe('62c3bc');
    expect(hex(new Uint8Array())).toBe('40');
    expect(hex(Uint8Array.of(1, 2, 3, 4))).toBe('4401020304');
  });

  it('writes maps in the order given, nested', () => {
    expect(hex(new Map())).toBe('a0');
    expect(
      hex(
        new Map<number | string, Cbor>([
          [1, 2],
          [3, 4],
        ]),
      ),
    ).toBe('a201020304');
    expect(hex(new Map<number | string, Cbor>([['a', new Map([[-1, 1]])]]))).toBe('a16161a12001');
  });

  it('writes a byte string longer than a byte can count', () => {
    expect(hex(new Uint8Array(300)).slice(0, 6)).toBe('59012c');
  });

  it('refuses what an attestation never holds', () => {
    expect(() => encodeCbor(1.5)).toThrow(RangeError);
    expect(() => encodeCbor(2 ** 32)).toThrow(RangeError);
    expect(() => encodeCbor(-(2 ** 32) - 1)).toThrow(RangeError);
  });
});
