import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Catalog, Work } from './catalog.js';
import { readCatalog } from './read-catalog.js';

const work: Work = {
  objectId: 336228,
  slug: 'melencolia-i',
  title: 'Melencolia I',
  shortTitle: 'Melencolia I',
  artist: {
    name: 'Albrecht Dürer',
    bio: 'German, Nuremberg 1471–1528 Nuremberg',
    nationality: 'German',
    beginYear: 1471,
    endYear: 1528,
  },
  date: { display: '1514', beginYear: 1514, endYear: 1514 },
  medium: 'Engraving',
  dimensions: ['Plate: 9 7/16 × 7 5/16 in. (24 × 18.5 cm)'],
  classification: 'Prints',
  department: 'Drawings and Prints',
  culture: null,
  period: null,
  creditLine: 'Harris Brisbane Dick Fund, 1943',
  accessionNumber: '43.106.1',
  objectUrl: 'https://www.metmuseum.org/art/collection/search/336228',
  tags: [],
  image: {
    file: '336228.jpg',
    width: 1267,
    height: 1600,
    originalWidth: 2820,
    originalHeight: 3561,
    crop: null,
    sha256: 'a'.repeat(64),
    sourceUrl: 'https://images.metmuseum.org/CRDImages/dp/original/DP820348.jpg',
  },
};

const catalog = (works: Work[]): Catalog => ({
  version: 1,
  generatedAt: '2026-10-05T12:00:00.000Z',
  source: 'https://collectionapi.metmuseum.org/public/collection/v1',
  works,
});

describe('readCatalog', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'deckle-met-'));
    await mkdir(join(dir, 'images'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reads a data set whose images are all there', async () => {
    await writeFile(join(dir, 'catalog.json'), JSON.stringify(catalog([work])));
    await writeFile(join(dir, 'images', '336228.jpg'), '');
    await expect(readCatalog(dir)).resolves.toMatchObject({ works: [{ slug: work.slug }] });
  });

  it('names the images the data set lacks', async () => {
    await writeFile(join(dir, 'catalog.json'), JSON.stringify(catalog([work])));
    await expect(readCatalog(dir)).rejects.toThrow('does not have: 336228.jpg');
  });

  it('refuses an empty string where The Met had nothing', async () => {
    const empty = { ...work, culture: '' };
    await writeFile(join(dir, 'catalog.json'), JSON.stringify(catalog([empty])));
    await expect(readCatalog(dir)).rejects.toThrow();
  });

  it('refuses two works with one slug', async () => {
    await writeFile(join(dir, 'catalog.json'), JSON.stringify(catalog([work, work])));
    await expect(readCatalog(dir)).rejects.toThrow('slug of its own');
  });
});
