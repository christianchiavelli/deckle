import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { availableSizes } from '@deckle/print-sizes';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Catalog } from './catalog.js';
import { curation } from './curation.js';
import { MASTER } from './import/master.js';
import { readCatalog } from './read-catalog.js';

/** The committed data set, as every service will read it. */
const dataDir = fileURLToPath(new URL('../../../data/met/', import.meta.url));
/** The size the data set was planned to (docs/adr/0021-reduced-masters.md). */
const BUDGET_BYTES = 25_000_000;

describe('data/met', () => {
  let catalog: Catalog;

  beforeAll(async () => {
    catalog = await readCatalog(dataDir);
  });

  it('passes readCatalog, the check every seed runs first, with every curated work in order', () => {
    expect(
      catalog.works.map(({ objectId, slug, shortTitle, image }) => ({
        objectId,
        slug,
        shortTitle,
        ...(image.crop && { crop: image.crop }),
      })),
    ).toEqual(curation);
  });

  it('sizes a cropped work from the crop, not from the whole original', () => {
    for (const { slug, image } of catalog.works) {
      if (image.crop === null) continue;
      expect([image.originalWidth, image.originalHeight], slug).toEqual([
        image.crop.width,
        image.crop.height,
      ]);
    }
  });

  it('has no two impressions of one print', () => {
    const prints = catalog.works.map((work) => `${work.artist?.name ?? '-'}: ${work.title}`);
    expect(new Set(prints).size).toBe(prints.length);
  });

  it('shortens only long titles, and only by cutting The Met’s own words', () => {
    for (const { slug, title, shortTitle } of catalog.works) {
      if (title.length <= 40) expect(shortTitle, slug).toBe(title);
      else expect(title.toLowerCase(), slug).toContain(shortTitle.toLowerCase());
    }
  });

  it('keeps to prints made between 1450 and 1920', () => {
    for (const { slug, classification, date } of catalog.works) {
      expect(classification, slug).toBe('Prints');
      expect(date.beginYear, slug).toBeGreaterThanOrEqual(1450);
      expect(date.endYear, slug).toBeLessThanOrEqual(1920);
    }
  });

  it('shows the honest-size rule: some works print only at A4, some reach A2', () => {
    const largest = catalog.works.map(
      ({ image }) =>
        availableSizes({ width: image.originalWidth, height: image.originalHeight }).at(-1)?.size,
    );
    expect(largest).not.toContain(undefined);
    expect(largest.filter((size) => size === 'A4').length).toBeGreaterThanOrEqual(3);
    expect(largest.filter((size) => size === 'A2' || size === 'A1').length).toBeGreaterThanOrEqual(
      3,
    );
  });

  it('holds exactly the masters the catalog names, each matching its hash', async () => {
    const files = (await readdir(join(dataDir, 'images'))).filter((name) => !name.startsWith('.'));
    expect(files.sort()).toEqual(catalog.works.map((work) => work.image.file).sort());
    for (const { image } of catalog.works) {
      const bytes = await readFile(join(dataDir, 'images', image.file));
      expect(createHash('sha256').update(bytes).digest('hex'), image.file).toBe(image.sha256);
    }
  });

  it('keeps every master to the importer’s format and size, in sRGB without metadata', async () => {
    for (const { image } of catalog.works) {
      const meta = await sharp(join(dataDir, 'images', image.file)).metadata();
      expect(image.file.endsWith(`.${MASTER.format}`), image.file).toBe(true);
      expect([meta.width, meta.height], image.file).toEqual([image.width, image.height]);
      expect(Math.max(image.width, image.height), image.file).toBeLessThanOrEqual(MASTER.longEdge);
      expect(meta.space, image.file).toBe('srgb');
      expect(meta.hasProfile || meta.exif !== undefined || meta.xmp !== undefined, image.file).toBe(
        false,
      );
    }
  });

  it('stays within its size budget', async () => {
    let total = (await stat(join(dataDir, 'catalog.json'))).size;
    for (const { image } of catalog.works) {
      total += (await stat(join(dataDir, 'images', image.file))).size;
    }
    expect(total).toBeLessThanOrEqual(BUDGET_BYTES);
  });
});
