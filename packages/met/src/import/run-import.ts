import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { availableSizes } from '@deckle/print-sizes';
import type { CollectionClient } from '../api/collection-client.js';
import { normaliseObject } from '../api/normalise.js';
import { catalogSchema, type Catalog, type Work } from '../catalog.js';
import type { CuratedWork } from '../curation.js';
import { withFileSource } from '../image/file-source.js';
import { readJpegHeader } from '../image/jpeg-header.js';
import { readPreviousCatalog, serialiseCatalog, stampCatalog } from './catalog-file.js';
import { encodeMaster, type MasterSettings } from './master.js';
import { ensureOriginal } from './original-cache.js';
import { assertSellable } from './sellable.js';

export interface ImportOptions {
  readonly client: Pick<CollectionClient, 'object' | 'download'>;
  readonly curation: readonly CuratedWork[];
  /** `data/met`: the catalog and the masters are written here. */
  readonly dataDir: string;
  /** Where originals are kept between runs; never committed. */
  readonly cacheDir: string;
  readonly master: MasterSettings;
  /** The clock `generatedAt` is read from when the works changed. */
  readonly now: () => Date;
  readonly log?: (line: string) => void;
}

export interface ImportResult {
  readonly catalog: Catalog;
  /** Whether `catalog.json` was rewritten. */
  readonly changed: boolean;
  readonly downloaded: number;
}

/** Writes only when the bytes differ, so a run that changes nothing touches nothing. */
async function writeIfChanged(path: string, data: string | Buffer) {
  const next = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  try {
    if ((await readFile(path)).equals(next)) return false;
  } catch {
    // Not there yet.
  }
  await writeFile(path, next);
  return true;
}

const MASTER_FILE = /^\d+\.(?:jpg|webp)$/;

export async function runImport(options: ImportOptions): Promise<ImportResult> {
  const { client, curation, dataDir, cacheDir, master, now } = options;
  const log = options.log ?? (() => undefined);
  const imagesDir = join(dataDir, 'images');

  // Nothing is written until every work has come through, so a run that stops
  // halfway leaves the data set as it was rather than half old and half new.
  const works: Work[] = [];
  const masters = new Map<string, Buffer>();
  let downloaded = 0;
  for (const [index, entry] of curation.entries()) {
    const raw = await client.object(entry.objectId);
    const label = `${entry.slug} (${entry.objectId})`;
    assertSellable(raw, label);

    const original = await ensureOriginal(client, cacheDir, entry.objectId, raw.primaryImage);
    if (original.downloaded) downloaded++;
    const header = await withFileSource(original.path, readJpegHeader);
    const encoded = await encodeMaster(original.path, master);
    // The master is the original turned upright and scaled, so it keeps its
    // shape; if it does not, the header was misread and every size with it.
    if (encoded.width > encoded.height !== header.width > header.height) {
      throw new Error(`${label}: the header and the decoded image disagree on orientation`);
    }

    const file = `${entry.objectId}.${master.format}`;
    masters.set(file, encoded.data);
    const record = normaliseObject(raw);
    works.push({
      objectId: record.objectId,
      slug: entry.slug,
      title: record.title,
      shortTitle: entry.shortTitle,
      artist: record.artist,
      date: record.date,
      medium: record.medium,
      dimensions: record.dimensions,
      classification: record.classification,
      department: record.department,
      culture: record.culture,
      period: record.period,
      creditLine: record.creditLine,
      accessionNumber: record.accessionNumber,
      objectUrl: record.objectUrl,
      tags: record.tags,
      image: {
        file,
        width: encoded.width,
        height: encoded.height,
        originalWidth: header.width,
        originalHeight: header.height,
        sha256: createHash('sha256').update(encoded.data).digest('hex'),
        sourceUrl: raw.primaryImage,
      },
    });

    const largest = availableSizes(header).at(-1)?.size ?? 'no size';
    log(
      `${index + 1}/${curation.length} ${label}: ${header.width}x${header.height}` +
        `${original.downloaded ? ' (downloaded)' : ''}, prints up to ${largest}; ` +
        `master ${encoded.width}x${encoded.height}, ${Math.round(encoded.data.length / 1024)} KiB`,
    );
  }

  const catalogPath = join(dataDir, 'catalog.json');
  const catalog = catalogSchema.parse(
    stampCatalog(works, await readPreviousCatalog(catalogPath), now()),
  );

  await mkdir(imagesDir, { recursive: true });
  for (const [file, data] of masters) await writeIfChanged(join(imagesDir, file), data);
  // Masters of works that left the curation, or of an earlier format, go too.
  for (const name of await readdir(imagesDir)) {
    if (MASTER_FILE.test(name) && !masters.has(name)) {
      await rm(join(imagesDir, name));
      log(`removed ${name}`);
    }
  }

  const changed = await writeIfChanged(catalogPath, serialiseCatalog(catalog));
  return { catalog, changed, downloaded };
}
