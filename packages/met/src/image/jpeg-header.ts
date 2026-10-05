/**
 * Reads a JPEG's pixel size from its header, without decoding it and without
 * needing the whole file: the markers before the image data say how long each
 * segment is, so the reader can jump over large metadata segments instead of
 * reading them. Over HTTP Range requests, that is usually one 64 KiB request.
 */

/** Bytes at an offset, from wherever the file is. Returns fewer than asked at the end of the file. */
export interface ByteSource {
  read(offset: number, length: number): Promise<Uint8Array>;
}

export interface JpegHeader {
  /** As stored, before any EXIF rotation. */
  readonly storedWidth: number;
  readonly storedHeight: number;
  /** EXIF orientation, 1 to 8; 1 when the file carries none. */
  readonly orientation: number;
  /** As displayed, after EXIF rotation: what a print is made from. */
  readonly width: number;
  readonly height: number;
}

export class JpegHeaderError extends Error {
  override name = 'JpegHeaderError';
}

const SOI = 0xd8;
const SOS = 0xda;
const EOI = 0xd9;
const APP1 = 0xe1;
/** Start-of-frame markers: every one from C0 to CF except DHT (C4), JPG (C8) and DAC (CC). */
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
/** Markers that stand alone, with no length after them. */
const isStandalone = (marker: number) =>
  marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7) || marker === SOI;

/** "Exif" and two zero bytes: the identifier an APP1 segment opens with when it holds EXIF. */
const EXIF_ID = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
const ORIENTATION_TAG = 0x0112;

/** How far the reader goes looking for the frame header before it gives up on the file. */
const MAX_HEADER_BYTES = 16 * 1024 * 1024;

const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

async function readExactly(source: ByteSource, offset: number, length: number) {
  const bytes = await source.read(offset, length);
  if (bytes.length < length) {
    throw new JpegHeaderError(`The file ends at byte ${offset + bytes.length}, inside its header`);
  }
  return view(bytes);
}

const startsWith = (bytes: DataView, prefix: readonly number[]) =>
  bytes.byteLength >= prefix.length && prefix.every((byte, i) => bytes.getUint8(i) === byte);

/** The Orientation tag of IFD0 in an APP1 EXIF payload, or null when there is none or it is unreadable. */
export function exifOrientation(payload: Uint8Array): number | null {
  const bytes = view(payload);
  if (!startsWith(bytes, EXIF_ID) || bytes.byteLength < EXIF_ID.length + 8) return null;
  const tiff = EXIF_ID.length;
  const order = bytes.getUint16(tiff);
  if (order !== 0x4949 && order !== 0x4d4d) return null; // "II" little-endian, "MM" big-endian
  const little = order === 0x4949;
  try {
    const ifd = tiff + bytes.getUint32(tiff + 4, little);
    const entries = bytes.getUint16(ifd, little);
    for (let i = 0; i < entries; i++) {
      const entry = ifd + 2 + i * 12;
      if (bytes.getUint16(entry, little) === ORIENTATION_TAG) {
        const value = bytes.getUint16(entry + 8, little);
        return value >= 1 && value <= 8 ? value : null;
      }
    }
  } catch (error) {
    // An offset that points past the payload: the EXIF is damaged, not the image.
    if (error instanceof RangeError) return null;
    throw error;
  }
  return null;
}

export async function readJpegHeader(source: ByteSource): Promise<JpegHeader> {
  const start = await readExactly(source, 0, 2);
  if (start.getUint16(0) !== 0xff00 + SOI) {
    throw new JpegHeaderError('Not a JPEG: the file does not start with the SOI marker');
  }

  let orientation: number | null = null;
  let exifSeen = false;
  let offset = 2;
  while (offset < MAX_HEADER_BYTES) {
    const head = await readExactly(source, offset, 2);
    if (head.getUint8(0) !== 0xff) {
      throw new JpegHeaderError(`Expected a marker at byte ${offset}`);
    }
    const marker = head.getUint8(1);
    // 0xFF may repeat as fill before a marker.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (isStandalone(marker)) {
      offset += 2;
      continue;
    }
    if (marker === SOS || marker === EOI) {
      throw new JpegHeaderError('The image data starts before any frame header');
    }

    const length = (await readExactly(source, offset + 2, 2)).getUint16(0);
    if (length < 2) throw new JpegHeaderError(`The segment at byte ${offset} has length ${length}`);

    if (SOF.has(marker)) {
      // Precision (1 byte), then height and width (2 bytes each).
      const frame = await readExactly(source, offset + 4, 5);
      const storedHeight = frame.getUint16(1);
      const storedWidth = frame.getUint16(3);
      if (storedWidth === 0 || storedHeight === 0) {
        throw new JpegHeaderError('The frame header gives no size (a DNL marker sets it later)');
      }
      const turned = orientation !== null && orientation >= 5;
      return {
        storedWidth,
        storedHeight,
        orientation: orientation ?? 1,
        width: turned ? storedHeight : storedWidth,
        height: turned ? storedWidth : storedHeight,
      };
    }

    // APP1 holds EXIF or XMP; only EXIF says how to turn the image, and XMP can
    // run to tens of kilobytes, so the identifier is read before the payload.
    if (marker === APP1 && !exifSeen && length >= 2 + EXIF_ID.length) {
      if (startsWith(await readExactly(source, offset + 4, EXIF_ID.length), EXIF_ID)) {
        exifSeen = true;
        const payload = await source.read(offset + 4, length - 2);
        orientation = exifOrientation(payload);
      }
    }
    offset += 2 + length;
  }
  throw new JpegHeaderError(`No frame header in the first ${MAX_HEADER_BYTES} bytes`);
}
