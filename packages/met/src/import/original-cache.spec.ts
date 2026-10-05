import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureOriginal, originalPath, type Downloader } from './original-cache.js';

const URL = 'https://images.metmuseum.org/CRDImages/dp/original/DP820348.jpg';

describe('originalPath', () => {
  it('names the file after the object and The Met’s own file name', () => {
    expect(originalPath('/cache', 336228, URL)).toBe(
      join('/cache', 'originals', '336228-DP820348.jpg'),
    );
  });

  it('keeps only safe characters', () => {
    expect(originalPath('/c', 1, 'https://x/a/My%20Scan(1).jpg')).toBe(
      join('/c', 'originals', '1-My_20Scan_1_.jpg'),
    );
    expect(originalPath('/c', 1, 'https://x/')).toBe(join('/c', 'originals', '1-original'));
  });
});

describe('ensureOriginal', () => {
  let cache: string;

  beforeEach(async () => {
    cache = await mkdtemp(join(tmpdir(), 'deckle-cache-'));
  });

  afterEach(async () => {
    await rm(cache, { recursive: true, force: true });
  });

  it('downloads an original the first time and never again', async () => {
    const download = vi.fn<Downloader['download']>(async (_url, destination) => {
      await writeFile(destination, 'jpeg bytes');
      return { bytes: 10 };
    });
    const first = await ensureOriginal({ download }, cache, 336228, URL);
    const second = await ensureOriginal({ download }, cache, 336228, URL);
    expect(first).toEqual({ path: originalPath(cache, 336228, URL), downloaded: true });
    expect(second).toEqual({ path: first.path, downloaded: false });
    expect(download).toHaveBeenCalledTimes(1);
    expect(await readFile(first.path, 'utf8')).toBe('jpeg bytes');
  });

  it('leaves nothing under the final name when the download fails', async () => {
    const download = vi.fn<Downloader['download']>(() => Promise.reject(new Error('cut off')));
    await expect(ensureOriginal({ download }, cache, 1, URL)).rejects.toThrow('cut off');
    await expect(readFile(originalPath(cache, 1, URL))).rejects.toThrow();
  });
});
