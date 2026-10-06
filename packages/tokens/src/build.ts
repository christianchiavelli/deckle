// Writes dist/ from tokens/: `pnpm --filter @deckle/tokens build`, and on install.
import StyleDictionary from 'style-dictionary';
import { createConfig } from './config.ts';

const dictionary = new StyleDictionary(createConfig());
await dictionary.buildAllPlatforms();
process.stdout.write(
  '@deckle/tokens: wrote tokens.css, index.js, index.d.ts and foundations.json\n',
);
