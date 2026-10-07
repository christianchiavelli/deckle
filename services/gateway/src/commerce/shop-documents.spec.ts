import { readFile } from 'node:fs/promises';
import { buildSchema, type GraphQLSchema, parse, validate } from 'graphql';
import { beforeAll, describe, expect, it } from 'vitest';
import * as catalogue from './shop-api.documents.js';
import * as orders from './shop-orders.documents.js';

/**
 * The Shop API as commerce prints it, which CI keeps current (`schema:check`).
 * The API tests talk to a fake shop that reads operations by name, so only this
 * check sees an operation the real Vendure would refuse as invalid.
 */
const SHOP_API = new URL('../../../commerce/schema/shop-api.graphql', import.meta.url);

const operations = Object.entries({ ...catalogue, ...orders }).filter(
  (entry): entry is [string, string] => typeof entry[1] === 'string',
);

describe('the Shop API operations the gateway sends', () => {
  let shopApi: GraphQLSchema;

  beforeAll(async () => {
    shopApi = buildSchema(await readFile(SHOP_API, 'utf8'));
  });

  it('are all checked here', () => {
    expect(operations.map(([name]) => name)).toEqual(
      expect.arrayContaining(['ARTWORK_PRODUCTS', 'EDITIONS', 'ADD_ITEM', 'ADD_PAYMENT']),
    );
  });

  it.each(operations)('%s is valid against the schema commerce serves', (_name, operation) => {
    expect(validate(shopApi, parse(operation)).map((error) => error.message)).toEqual([]);
  });
});
