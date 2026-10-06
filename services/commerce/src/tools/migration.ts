import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { generateMigration } from '@vendure/core';
import { tidyMigration } from '../database/migration-template.js';
import { parseCommerceEnv } from '../env.js';
import { createVendureConfig } from '../vendure-config.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../src/migrations', import.meta.url));

/**
 * `migration:generate <name>`: diffs the database at `DATABASE_URL` against the config
 * (custom fields included) and writes the migration that closes the gap. Run it
 * against a database that has every existing migration applied.
 */
async function main(name: string | undefined): Promise<number> {
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
    process.stderr.write('Usage: migration.js <kebab-case-name>\n');
    return 2;
  }
  const env = parseCommerceEnv(process.env);
  const file = await generateMigration(createVendureConfig(env, { process: 'tool' }), {
    name,
    outputDir: MIGRATIONS_DIR,
  });
  if (file === undefined) {
    return 0;
  }
  await writeFile(file, tidyMigration(await readFile(file, 'utf8')));
  process.stdout.write(
    `Wrote ${file}\nAdd its class to src/migrations/index.ts, then run Prettier on it.\n`,
  );
  return 0;
}

main(process.argv[2]).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    );
    process.exitCode = 1;
  },
);
