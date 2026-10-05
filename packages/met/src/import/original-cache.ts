import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface Downloader {
  download(url: string, destination: string): Promise<{ bytes: number }>;
}

/**
 * Where an original is kept: after the object and The Met's own file name, so
 * a new photograph of a work lands beside the old one instead of being
 * mistaken for it.
 */
export function originalPath(cacheDir: string, objectId: number, url: string) {
  const name = new URL(url).pathname.split('/').at(-1) ?? '';
  const safe = name.replace(/[^\w.-]/g, '_');
  return join(cacheDir, 'originals', `${objectId}-${safe === '' ? 'original' : safe}`);
}

async function isFile(path: string) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/**
 * The original on disk, downloaded the first time it is asked for and never
 * again: a download is written to a `.part` file and renamed only once whole,
 * so a file under its final name is always complete.
 */
export async function ensureOriginal(
  downloader: Downloader,
  cacheDir: string,
  objectId: number,
  url: string,
): Promise<{ path: string; downloaded: boolean }> {
  const path = originalPath(cacheDir, objectId, url);
  if (await isFile(path)) return { path, downloaded: false };
  await mkdir(dirname(path), { recursive: true });
  await downloader.download(url, path);
  return { path, downloaded: true };
}
