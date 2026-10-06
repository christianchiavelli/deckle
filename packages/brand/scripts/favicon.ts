// Writes assets/favicon.svg, the seal in the accent copper of both themes.
// `pnpm --filter @deckle/brand favicon` after the seal or the accent changes; a
// unit test fails while the committed file is stale.
import { writeFile } from 'node:fs/promises';
import foundations from '@deckle/tokens/foundations.json' with { type: 'json' };
import { copperFrom } from '../src/copper.js';
import { favicon } from '../src/favicon.js';

await writeFile(
  new URL('../assets/favicon.svg', import.meta.url),
  favicon(copperFrom(foundations.colours)),
);
process.stdout.write('@deckle/brand: wrote assets/favicon.svg\n');
