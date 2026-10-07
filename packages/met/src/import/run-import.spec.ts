import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import melencolia from '../api/fixtures/336228-melencolia-i.json' with { type: 'json' };
import rhinoceros from '../api/fixtures/356497-the-rhinoceros.json' with { type: 'json' };
import theLetter from '../api/fixtures/352204-the-letter-not-public-domain.json' with { type: 'json' };
import { MetNotFoundError } from '../api/errors.js';
import { metObjectSchema, type MetObject } from '../api/met-object.js';
import type { CuratedWork } from '../curation.js';
import { readCatalog } from '../read-catalog.js';
import { makeJpeg } from '../test/images.js';
import type { MasterSettings } from './master.js';
import { runImport, type ImportOptions } from './run-import.js';
import { CurationError } from './sellable.js';

const curation: CuratedWork[] = [
  { objectId: 336228, slug: 'melencolia-i', shortTitle: 'Melencolia I' },
  { objectId: 356497, slug: 'the-rhinoceros', shortTitle: 'The Rhinoceros' },
];
const master: MasterSettings = { format: 'webp', longEdge: 128, quality: 70 };
const first = new Date('2026-10-05T12:00:00.000Z');
const later = new Date('2026-10-06T12:00:00.000Z');

/** The Met, played by fixtures: records by id and originals by URL, counting downloads. */
function fakeMet(records: MetObject[], originals: Map<string, Uint8Array>) {
  const downloads: string[] = [];
  const client: ImportOptions['client'] = {
    object(objectId) {
      const record = records.find((candidate) => candidate.objectID === objectId);
      return record
        ? Promise.resolve(record)
        : Promise.reject(new MetNotFoundError(`objects/${objectId}`, 'unknown'));
    },
    async download(url, destination) {
      downloads.push(url);
      const bytes = originals.get(url);
      if (!bytes) throw new Error(`no original at ${url}`);
      await writeFile(destination, bytes);
      return { bytes: bytes.length };
    },
  };
  return { client, downloads };
}

describe('runImport', () => {
  let dataDir: string;
  let records: MetObject[];
  let originals: Map<string, Uint8Array>;

  const run = (met: ReturnType<typeof fakeMet>, now: Date, works = curation) =>
    runImport({
      client: met.client,
      curation: works,
      dataDir,
      cacheDir: join(dataDir, '.cache'),
      master,
      now: () => now,
    });

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'deckle-import-'));
    records = [metObjectSchema.parse(melencolia), metObjectSchema.parse(rhinoceros)];
    originals = new Map([
      [records[0]!.primaryImage, await makeJpeg(300, 380, { noise: true })],
      [records[1]!.primaryImage, await makeJpeg(400, 320, { noise: true })],
    ]);
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it('writes a data set that readCatalog accepts, in curation order', async () => {
    const met = fakeMet(records, originals);
    const lines: string[] = [];
    const result = await runImport({
      client: met.client,
      curation,
      dataDir,
      cacheDir: join(dataDir, '.cache'),
      master,
      now: () => first,
      log: (line) => lines.push(line),
    });

    const catalog = await readCatalog(dataDir);
    expect(catalog).toEqual(result.catalog);
    expect(catalog.generatedAt).toBe(first.toISOString());
    expect(catalog.works.map((work) => work.slug)).toEqual(['melencolia-i', 'the-rhinoceros']);
    expect(result).toMatchObject({ changed: true, downloaded: 2 });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('1/2 melencolia-i (336228): 300x380 (downloaded)');

    const [durer] = catalog.works;
    expect(durer!.image).toMatchObject({
      file: '336228.webp',
      width: 101,
      height: 128,
      originalWidth: 300,
      originalHeight: 380,
      sourceUrl: records[0]!.primaryImage,
    });
    const bytes = await readFile(join(dataDir, 'images', '336228.webp'));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(durer!.image.sha256);
    expect(durer!.culture).toBeNull();

    const text = await readFile(join(dataDir, 'catalog.json'), 'utf8');
    expect(text.endsWith('}\n')).toBe(true);
    expect(text).not.toContain('\r');
  });

  it('rewrites nothing on a second run with the cache warm', async () => {
    const met = fakeMet(records, originals);
    await run(met, first);
    const before = await readFile(join(dataDir, 'catalog.json'));
    const image = await readFile(join(dataDir, 'images', '356497.webp'));

    const again = await run(met, later);
    expect(again).toMatchObject({ changed: false, downloaded: 0 });
    expect(met.downloads).toHaveLength(2);
    expect((await readFile(join(dataDir, 'catalog.json'))).equals(before)).toBe(true);
    expect((await readFile(join(dataDir, 'images', '356497.webp'))).equals(image)).toBe(true);
  });

  it('moves generatedAt when The Met’s record changes', async () => {
    await run(fakeMet(records, originals), first);
    records[1] = { ...records[1]!, creditLine: 'Gift of Junius Spencer Morgan, 1919 (revised)' };
    const result = await run(fakeMet(records, originals), later);
    expect(result.changed).toBe(true);
    expect(result.catalog.generatedAt).toBe(later.toISOString());
  });

  it('removes masters of works that left the curation, and nothing else', async () => {
    await mkdir(join(dataDir, 'images'), { recursive: true });
    await writeFile(join(dataDir, 'images', '999.jpg'), 'old master');
    await writeFile(join(dataDir, 'images', '.gitkeep'), '');
    await run(fakeMet(records, originals), first);
    expect((await readdir(join(dataDir, 'images'))).sort()).toEqual([
      '.gitkeep',
      '336228.webp',
      '356497.webp',
    ]);
  });

  it('sizes and masters only the crop where the curation cuts one, and records it', async () => {
    const crop = { left: 20, top: 0, width: 240, height: 380 };
    const works = [{ ...curation[0]!, crop }, curation[1]!];
    const lines: string[] = [];
    const result = await runImport({
      client: fakeMet(records, originals).client,
      curation: works,
      dataDir,
      cacheDir: join(dataDir, '.cache'),
      master,
      now: () => first,
      log: (line) => lines.push(line),
    });

    const [durer, rhino] = result.catalog.works;
    expect(durer!.image).toMatchObject({
      width: 81,
      height: 128,
      originalWidth: 240,
      originalHeight: 380,
      crop,
    });
    expect(rhino!.image.crop).toBeNull();
    expect(lines[0]).toContain('melencolia-i (336228): 240x380 of 300x380');
  });

  it('stops at a crop that runs past the original', async () => {
    const works = [{ ...curation[0]!, crop: { left: 100, top: 0, width: 240, height: 380 } }];
    await expect(run(fakeMet(records, originals), first, works)).rejects.toThrow(
      'the crop runs past the 300x380 original',
    );
  });

  it('stops at a curated work that is not in the public domain, before downloading it', async () => {
    const letter = metObjectSchema.parse(theLetter);
    const met = fakeMet([...records, letter], originals);
    const works = [...curation, { objectId: 352204, slug: 'the-letter', shortTitle: 'The Letter' }];
    await expect(run(met, first, works)).rejects.toBeInstanceOf(CurationError);
    expect(met.downloads).toHaveLength(2);
    // Nothing is written for the works that did come through either.
    await expect(readFile(join(dataDir, 'catalog.json'))).rejects.toThrow();
    await expect(readdir(join(dataDir, 'images'))).rejects.toThrow();
  });
});
