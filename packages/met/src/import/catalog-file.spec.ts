import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Catalog, Work } from '../catalog.js';
import {
  CATALOG_SOURCE,
  readPreviousCatalog,
  serialiseCatalog,
  stampCatalog,
} from './catalog-file.js';

const work: Work = {
  objectId: 45434,
  slug: 'under-the-wave-off-kanagawa',
  title: 'Under the Wave off Kanagawa',
  shortTitle: 'Under the Wave off Kanagawa',
  artist: null,
  date: { display: 'ca. 1830–32', beginYear: 1820, endYear: 1842 },
  medium: null,
  dimensions: [],
  classification: 'Prints',
  department: 'Asian Art',
  culture: 'Japan',
  period: null,
  creditLine: null,
  accessionNumber: 'JP1847',
  objectUrl: 'https://www.metmuseum.org/art/collection/search/45434',
  tags: ['Waves'],
  image: {
    file: '45434.webp',
    width: 2400,
    height: 1613,
    originalWidth: 3859,
    originalHeight: 2594,
    sha256: 'b'.repeat(64),
    sourceUrl: 'https://images.metmuseum.org/CRDImages/as/original/DP130155.jpg',
  },
};

const before = new Date('2026-10-01T09:00:00.000Z');
const later = new Date('2026-10-05T18:00:00.000Z');

describe('stampCatalog', () => {
  it('dates a first catalog now', () => {
    expect(stampCatalog([work], null, later)).toEqual({
      version: 1,
      generatedAt: later.toISOString(),
      source: CATALOG_SOURCE,
      works: [work],
    });
  });

  it('keeps the date when the works come out exactly as they were', () => {
    const previous = stampCatalog([work], null, before);
    const again = stampCatalog([structuredClone(work)], previous, later);
    expect(again.generatedAt).toBe(before.toISOString());
  });

  it('moves the date when anything in the works changed', () => {
    const previous = stampCatalog([work], null, before);
    const retitled = { ...work, shortTitle: 'The Great Wave' };
    expect(stampCatalog([retitled], previous, later).generatedAt).toBe(later.toISOString());
    expect(stampCatalog([], previous, later).generatedAt).toBe(later.toISOString());
  });

  it('moves the date when the catalog came from another source', () => {
    const previous: Catalog = {
      ...stampCatalog([work], null, before),
      source: 'https://elsewhere.example/',
    };
    expect(stampCatalog([work], previous, later).generatedAt).toBe(later.toISOString());
  });
});

describe('serialiseCatalog', () => {
  it('writes two-space JSON with LF endings and a final newline', () => {
    const text = serialiseCatalog(stampCatalog([work], null, before));
    expect(text.endsWith('}\n')).toBe(true);
    expect(text).not.toContain('\r');
    expect(text.split('\n')[1]).toBe('  "version": 1,');
  });
});

describe('readPreviousCatalog', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'deckle-catalog-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reads a catalog written before', async () => {
    const catalog = stampCatalog([work], null, before);
    await writeFile(join(dir, 'catalog.json'), serialiseCatalog(catalog));
    await expect(readPreviousCatalog(join(dir, 'catalog.json'))).resolves.toEqual(catalog);
  });

  it('is null when there is none, or it is not JSON, or not a catalog', async () => {
    await expect(readPreviousCatalog(join(dir, 'missing.json'))).resolves.toBeNull();
    await writeFile(join(dir, 'broken.json'), '{"version":');
    await expect(readPreviousCatalog(join(dir, 'broken.json'))).resolves.toBeNull();
    await writeFile(join(dir, 'other.json'), '{"version":2}');
    await expect(readPreviousCatalog(join(dir, 'other.json'))).resolves.toBeNull();
  });
});
