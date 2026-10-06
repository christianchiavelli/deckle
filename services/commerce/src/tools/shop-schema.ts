import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrap, DefaultLogger, LogLevel } from '@vendure/core';
import {
  buildClientSchema,
  getIntrospectionQuery,
  lexicographicSortSchema,
  printSchema,
  type IntrospectionQuery,
} from 'graphql';
import { z } from 'zod';
import { createVendureConfig } from '../vendure-config.js';
import { buildTimeEnv } from './build-time-env.js';

/** Committed, so the gateway types its documents against it without a running server. */
export const SHOP_SCHEMA_FILE = fileURLToPath(
  new URL('../../schema/shop-api.graphql', import.meta.url),
);

const HEADER = [
  '# The Shop API as Vendure 3.7.4 serves it, custom fields and the deckle strategy included.',
  '# Written by `pnpm --filter @deckle/commerce schema`; `schema:check` fails when it drifts.',
  '',
  '',
].join('\n');

const introspectionResponse = z.object({
  data: z.object({ __schema: z.object({ types: z.array(z.unknown()) }).loose() }),
});

/**
 * Boots the real server, with every plugin and custom field, on an in-memory sql.js
 * database, and asks its Shop API for its schema over HTTP: what the gateway gets is
 * what is printed. Sorted, so the file changes only when the schema does.
 */
export async function printShopSchema(): Promise<string> {
  // Vendure reads the switch from the process environment, which nothing sets when the
  // tool runs outside compose; the server it boots here must not report home either.
  process.env['VENDURE_DISABLE_TELEMETRY'] = buildTimeEnv.VENDURE_DISABLE_TELEMETRY;
  const assetsDir = await mkdtemp(join(tmpdir(), 'deckle-commerce-schema-'));
  const config = createVendureConfig(buildTimeEnv, { process: 'tool', assetsDir });
  const app = await bootstrap({
    ...config,
    apiOptions: { ...config.apiOptions, port: 0, hostname: '127.0.0.1', introspection: true },
    dbConnectionOptions: { type: 'sqljs', synchronize: true, logging: false },
    logger: new DefaultLogger({ level: LogLevel.Warn }),
  });
  try {
    const response = await fetch(`${await app.getUrl()}/shop-api`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: getIntrospectionQuery({ descriptions: true }) }),
    });
    const { data } = introspectionResponse.parse(await response.json());
    // buildClientSchema checks the rest of the introspection result itself.
    const schema = buildClientSchema(data as unknown as IntrospectionQuery);
    return `${HEADER}${printSchema(lexicographicSortSchema(schema))}\n`;
  } finally {
    await app.close();
    await rm(assetsDir, { recursive: true, force: true });
  }
}

async function main(mode: string | undefined): Promise<number> {
  const schema = await printShopSchema();
  if (mode === 'write') {
    await writeFile(SHOP_SCHEMA_FILE, schema);
    process.stdout.write(`Wrote ${SHOP_SCHEMA_FILE}\n`);
    return 0;
  }
  if (mode === 'check') {
    const committed = await readFile(SHOP_SCHEMA_FILE, 'utf8').catch(() => '');
    if (committed.replace(/\r\n/g, '\n') === schema) {
      process.stdout.write('The committed Shop API schema matches the server\n');
      return 0;
    }
    process.stderr.write(
      `${SHOP_SCHEMA_FILE} is out of date: run \`pnpm --filter @deckle/commerce schema\` and commit it\n`,
    );
    return 1;
  }
  process.stderr.write('Usage: shop-schema.js write|check\n');
  return 2;
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
