import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { catalogSchema, type Catalog, type Work } from '../catalog.js';

export const CATALOG_SOURCE = 'https://collectionapi.metmuseum.org/public/collection/v1';

/** Pretty JSON, LF line endings and a final newline: the form the file is committed in. */
export function serialiseCatalog(catalog: Catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

/** The catalog already on disk, or null when there is none or it no longer reads as one. */
export async function readPreviousCatalog(path: string): Promise<Catalog | null> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    return null;
  }
  try {
    const parsed = catalogSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * `generatedAt` records when the data set last changed, not when the importer
 * last ran. It is carried over when the works come out exactly as they were,
 * so a re-run with nothing new rewrites nothing, leaves the working tree clean,
 * and a change in the date always means a change in the data.
 */
export function stampCatalog(works: readonly Work[], previous: Catalog | null, now: Date): Catalog {
  const unchanged =
    previous !== null &&
    previous.source === CATALOG_SOURCE &&
    isDeepStrictEqual(previous.works, works);
  return {
    version: 1,
    generatedAt: unchanged ? previous.generatedAt : now.toISOString(),
    source: CATALOG_SOURCE,
    works: [...works],
  };
}
