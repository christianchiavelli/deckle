import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { catalogSchema, type Catalog } from './catalog.js';

/**
 * Reads and checks `catalog.json` in `dir`, and that every image it names is
 * there: a seed that starts from a broken data set fails here, not halfway in.
 */
export async function readCatalog(dir: string): Promise<Catalog> {
  const raw: unknown = JSON.parse(await readFile(join(dir, 'catalog.json'), 'utf8'));
  const catalog = catalogSchema.parse(raw);

  const missing: string[] = [];
  await Promise.all(
    catalog.works.map(async ({ image }) => {
      try {
        await stat(join(dir, 'images', image.file));
      } catch {
        missing.push(image.file);
      }
    }),
  );
  if (missing.length > 0) {
    throw new Error(`The data set names images it does not have: ${missing.sort().join(', ')}`);
  }
  return catalog;
}
