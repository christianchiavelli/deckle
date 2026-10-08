/**
 * Just enough CBOR (RFC 8949) to write a WebAuthn attestation: integers, byte
 * and text strings, and maps in the order given. It only writes; the gateway's
 * SimpleWebAuthn does the reading.
 */
export type Cbor = number | string | Uint8Array | ReadonlyMap<number | string, Cbor>;

const UNSIGNED = 0;
const NEGATIVE = 1;
const BYTES = 2;
const TEXT = 3;
const MAP = 5;

export function encodeCbor(value: Cbor): Uint8Array {
  const out: number[] = [];
  write(value, out);
  return Uint8Array.from(out);
}

/** A major type and its argument, in the fewest bytes that hold it. */
function head(major: number, argument: number, out: number[]): void {
  const type = major << 5;
  if (argument < 24) {
    out.push(type | argument);
  } else if (argument < 0x100) {
    out.push(type | 24, argument);
  } else if (argument < 0x1_0000) {
    out.push(type | 25, argument >>> 8, argument & 0xff);
  } else {
    out.push(
      type | 26,
      argument >>> 24,
      (argument >>> 16) & 0xff,
      (argument >>> 8) & 0xff,
      argument & 0xff,
    );
  }
}

function append(bytes: Uint8Array, out: number[]): void {
  for (const byte of bytes) {
    out.push(byte);
  }
}

function write(value: Cbor, out: number[]): void {
  if (typeof value === 'number') {
    // Four bytes of argument are all an attestation needs; anything else is a mistake.
    if (!Number.isInteger(value) || value > 0xffff_ffff || value < -0x1_0000_0000) {
      throw new RangeError(`CBOR here writes 32-bit integers, not ${String(value)}`);
    }
    if (value >= 0) {
      head(UNSIGNED, value, out);
    } else {
      head(NEGATIVE, -1 - value, out);
    }
  } else if (typeof value === 'string') {
    const bytes = new TextEncoder().encode(value);
    head(TEXT, bytes.length, out);
    append(bytes, out);
  } else if (value instanceof Uint8Array) {
    head(BYTES, value.length, out);
    append(value, out);
  } else {
    head(MAP, value.size, out);
    for (const [key, item] of value) {
      write(key, out);
      write(item, out);
    }
  }
}
