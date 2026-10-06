import 'reflect-metadata';
import { readFile, writeFile } from 'node:fs/promises';
import { printGatewaySchema, SCHEMA_FILE } from './schema-file.js';

/**
 * `write` regenerates schema.gql; `check` fails when the committed file is not
 * what the code generates, which means someone changed a resolver without it.
 */
const mode = process.argv[2];
const generated = await printGatewaySchema();

if (mode === 'check') {
  const committed = await readFile(SCHEMA_FILE, 'utf8').catch(() => '');
  if (committed.replaceAll('\r\n', '\n') === generated) {
    process.stdout.write('schema.gql matches the code.\n');
  } else {
    process.stderr.write(
      'schema.gql is out of date: run `pnpm --filter @deckle/gateway schema:generate` and commit it.\n',
    );
    process.exitCode = 1;
  }
} else if (mode === 'write') {
  await writeFile(SCHEMA_FILE, generated);
  process.stdout.write(`Wrote ${SCHEMA_FILE}\n`);
} else {
  process.stderr.write('Usage: schema-cli.js write|check\n');
  process.exitCode = 2;
}
