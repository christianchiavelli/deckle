/**
 * Lists candidate works for the curation: what a search finds, with what The
 * Met says about each and the paper sizes its original can honestly print.
 * The size comes from the original's header, read with a Range request, so a
 * hundred candidates cost a few megabytes rather than a few hundred.
 *
 *   pnpm --filter @deckle/met candidates --q hokusai --artist --department 6 --limit 40
 *   pnpm --filter @deckle/met candidates --ids 336228,45434
 */
import { parseArgs } from 'node:util';
import { createCollectionClient } from '../api/collection-client.js';
import { describeCandidates, searchQuery } from './candidates.js';

const { values } = parseArgs({
  options: {
    q: { type: 'string' },
    ids: { type: 'string' },
    department: { type: 'string' },
    medium: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    artist: { type: 'boolean' },
    title: { type: 'boolean' },
    offset: { type: 'string' },
    limit: { type: 'string' },
  },
});

const out = (line: string) => process.stdout.write(`${line}\n`);
const client = createCollectionClient();

let ids: readonly number[];
if (values.ids === undefined) {
  const query = searchQuery(values);
  const page = await client.search(query);
  out(`# ${page.total} matches; showing ${page.objectIds.length} from ${query.offset ?? 0}`);
  ids = page.objectIds;
} else {
  ids = values.ids.split(',').map(Number);
}
await describeCandidates(client, ids, out);
