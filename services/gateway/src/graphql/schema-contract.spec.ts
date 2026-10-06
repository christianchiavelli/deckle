import { readFile } from 'node:fs/promises';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { lexicographicSortSchema, printSchema } from 'graphql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FakeUpstreams } from '../../test/support/fake-upstreams.js';
import { createTestApp, type TestApp, testEnv } from '../../test/support/test-app.js';
import { printGatewaySchema, SCHEMA_FILE } from './schema-file.js';

describe('the schema contract', () => {
  const upstreams = new FakeUpstreams();
  let gateway: TestApp;

  beforeAll(async () => {
    await upstreams.start();
    gateway = await createTestApp({ env: testEnv(upstreams) });
  });

  afterAll(async () => {
    await gateway.close();
    await upstreams.close();
  });

  it('is what the committed schema.gql says', async () => {
    const committed = (await readFile(SCHEMA_FILE, 'utf8')).replaceAll('\r\n', '\n');
    expect(await printGatewaySchema(), 'run `pnpm --filter @deckle/gateway schema:generate`').toBe(
      committed,
    );
  });

  it('is the schema the running gateway serves, so no resolver is missing from the list', async () => {
    const served = printSchema(lexicographicSortSchema(gateway.app.get(GraphQLSchemaHost).schema));
    expect(await printGatewaySchema()).toContain(served);
  });
});
