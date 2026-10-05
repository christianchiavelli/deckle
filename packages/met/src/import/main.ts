/**
 * `pnpm --filter @deckle/met import`: fetches every curated work, downloads
 * its original once into data/met/.cache, and writes data/met/catalog.json and
 * the reduced masters. A second run with the cache warm rewrites nothing.
 */
import { join, resolve } from 'node:path';
import { createCollectionClient } from '../api/collection-client.js';
import { curation } from '../curation.js';
import { MASTER } from './master.js';
import { runImport } from './run-import.js';

const dataDir = resolve(import.meta.dirname, '../../../../data/met');
const log = (line: string) => process.stdout.write(`${line}\n`);

try {
  const started = Date.now();
  const result = await runImport({
    client: createCollectionClient(),
    curation,
    dataDir,
    cacheDir: join(dataDir, '.cache'),
    master: MASTER,
    now: () => new Date(),
    log,
  });
  const seconds = Math.round((Date.now() - started) / 1000);
  log(
    `${result.catalog.works.length} works, ${result.downloaded} originals downloaded, ` +
      `catalog ${result.changed ? 'rewritten' : 'unchanged'}, in ${seconds} s`,
  );
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
