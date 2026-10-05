import { describe, expect, it } from 'vitest';
import { makeJpeg, memorySource, withSegment } from '../test/images.js';
import {
  exifOrientation,
  JpegHeaderError,
  readJpegHeader,
  type ByteSource,
} from './jpeg-header.js';

const bytes = (...values: number[]) => new Uint8Array(values);

/** An APP1 EXIF payload with one IFD0 entry, the Orientation tag, in either byte order. */
function exifPayload(orientation: number, order: 'II' | 'MM') {
  const little = order === 'II';
  const tiff = new DataView(new ArrayBuffer(8 + 2 + 12 + 4));
  tiff.setUint16(0, little ? 0x4949 : 0x4d4d);
  tiff.setUint16(2, 42, little);
  tiff.setUint32(4, 8, little);
  tiff.setUint16(8, 1, little);
  tiff.setUint16(10, 0x0112, little);
  tiff.setUint16(12, 3, little);
  tiff.setUint32(14, 1, little);
  tiff.setUint16(18, orientation, little);
  const payload = new Uint8Array(6 + tiff.byteLength);
  payload.set([0x45, 0x78, 0x69, 0x66, 0, 0]);
  payload.set(new Uint8Array(tiff.buffer), 6);
  return payload;
}

describe('readJpegHeader', () => {
  it('reads the size of a baseline JPEG', async () => {
    const { source } = memorySource(await makeJpeg(64, 48));
    await expect(readJpegHeader(source)).resolves.toEqual({
      storedWidth: 64,
      storedHeight: 48,
      orientation: 1,
      width: 64,
      height: 48,
    });
  });

  it('reads a progressive JPEG, whose frame header is SOF2', async () => {
    const { source } = memorySource(await makeJpeg(30, 70, { progressive: true }));
    await expect(readJpegHeader(source)).resolves.toMatchObject({ width: 30, height: 70 });
  });

  it('turns the size when EXIF says the image is stored on its side', async () => {
    const { source } = memorySource(await makeJpeg(64, 48, { orientation: 6 }));
    await expect(readJpegHeader(source)).resolves.toEqual({
      storedWidth: 64,
      storedHeight: 48,
      orientation: 6,
      width: 48,
      height: 64,
    });
  });

  it('jumps over a large metadata segment without reading it', async () => {
    const jpeg = withSegment(await makeJpeg(10, 20), 0xed, 60_000);
    const { source, reads } = memorySource(jpeg);
    await expect(readJpegHeader(source)).resolves.toMatchObject({ width: 10, height: 20 });
    const readInsideSegment = reads.some(([offset]) => offset > 6 && offset < 2 + 4 + 60_000);
    expect(readInsideSegment).toBe(false);
  });

  it('reads the identifier of an XMP segment but not its payload', async () => {
    const xmp = withSegment(await makeJpeg(10, 20), 0xe1, 40_000);
    const { source, reads } = memorySource(xmp);
    await expect(readJpegHeader(source)).resolves.toMatchObject({ orientation: 1 });
    expect(reads.filter(([offset]) => offset === 6).map(([, length]) => length)).toEqual([6]);
  });

  it('steps over fill bytes and standalone markers before a frame header', async () => {
    const frame = bytes(
      0xff,
      0xc0,
      0x00,
      0x0b,
      0x08,
      0x00,
      0x05,
      0x00,
      0x07,
      0x01,
      0x01,
      0x11,
      0x00,
    );
    const file = new Uint8Array([0xff, 0xd8, 0xff, 0xff, 0xff, 0x01, 0xff, 0xd0, ...frame]);
    await expect(readJpegHeader(memorySource(file).source)).resolves.toMatchObject({
      width: 7,
      height: 5,
    });
  });

  it('refuses what it cannot read', async () => {
    const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    const scanFirst = bytes(0xff, 0xd8, 0xff, 0xda, 0x00, 0x02);
    const truncated = (await makeJpeg(8, 8)).subarray(0, 30);
    const noSize = bytes(0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x00, 0x00, 0x00);
    const shortSegment = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01);
    const garbage = bytes(0xff, 0xd8, 0x12, 0x34);
    for (const [file, message] of [
      [png, 'Not a JPEG'],
      [scanFirst, 'before any frame header'],
      [truncated, 'inside its header'],
      [noSize, 'gives no size'],
      [shortSegment, 'has length 1'],
      [garbage, 'Expected a marker at byte 2'],
    ] as const) {
      await expect(readJpegHeader(memorySource(file).source)).rejects.toThrow(message);
    }
  });

  it('gives up on a file whose header never ends', async () => {
    // Endless APP0 segments of the largest size, made up on demand.
    const endless: ByteSource = {
      read(offset, length) {
        const out = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
          const position = (offset + i - 2) % 65_537;
          out[i] =
            offset + i < 2 ? [0xff, 0xd8][offset + i]! : ([0xff, 0xe0, 0xff, 0xff][position] ?? 0);
        }
        return Promise.resolve(out);
      },
    };
    await expect(readJpegHeader(endless)).rejects.toBeInstanceOf(JpegHeaderError);
  });
});

describe('exifOrientation', () => {
  it('reads the tag in both byte orders', () => {
    expect(exifOrientation(exifPayload(6, 'II'))).toBe(6);
    expect(exifOrientation(exifPayload(8, 'MM'))).toBe(8);
  });

  it('is null when the payload is not EXIF, is damaged, or the value is out of range', () => {
    expect(exifOrientation(bytes(1, 2, 3))).toBeNull();
    expect(exifOrientation(exifPayload(9, 'II'))).toBeNull();
    const wrongOrder = exifPayload(6, 'II');
    wrongOrder.set([0x58, 0x58], 6);
    expect(exifOrientation(wrongOrder)).toBeNull();
    const pastTheEnd = exifPayload(6, 'MM');
    new DataView(pastTheEnd.buffer).setUint32(6 + 4, 10_000);
    expect(exifOrientation(pastTheEnd)).toBeNull();
    const otherTag = exifPayload(6, 'MM');
    new DataView(otherTag.buffer).setUint16(6 + 10, 0x010f);
    expect(exifOrientation(otherTag)).toBeNull();
  });
});
