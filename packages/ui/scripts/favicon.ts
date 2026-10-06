// Writes brand/favicon.svg, the seal in the accent copper of both themes.
// `pnpm --filter @deckle/ui favicon` after the seal or the accent changes; a
// unit test fails while the committed file is stale.
import { writeFile } from 'node:fs/promises';
import { copper } from '../src/brand/copper.ts';
import { favicon } from '../src/brand/favicon.ts';

await writeFile(new URL('../brand/favicon.svg', import.meta.url), favicon(copper()));
process.stdout.write('@deckle/ui: wrote brand/favicon.svg\n');
