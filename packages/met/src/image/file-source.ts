import { open } from 'node:fs/promises';
import type { ByteSource } from './jpeg-header.js';

/** Lends `use` a byte source over a file on disk, and closes the file once it is done. */
export async function withFileSource<T>(
  path: string,
  use: (source: ByteSource) => Promise<T>,
): Promise<T> {
  const handle = await open(path, 'r');
  try {
    return await use({
      async read(offset, length) {
        const buffer = new Uint8Array(length);
        const { bytesRead } = await handle.read(buffer, 0, length, offset);
        return buffer.subarray(0, bytesRead);
      },
    });
  } finally {
    await handle.close();
  }
}
