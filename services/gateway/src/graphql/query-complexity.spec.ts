import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type DocumentNode,
  type GraphQLInputType,
  type GraphQLSchema,
  isEnumType,
  isInputObjectType,
  isInputType,
  isListType,
  isNonNullType,
  Kind,
  type OperationDefinitionNode,
  parse,
  typeFromAST,
} from 'graphql';
import { beforeAll, describe, expect, it } from 'vitest';
import { MAX_QUERY_COMPLEXITY } from './complexity.js';
import { queryComplexity } from './query-complexity.js';
import { buildGatewaySchema } from './schema-file.js';

/** Queries shaped like the store's pages, at their largest. */
const storePages = {
  listing: `{
    artworks(first: 48) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges { cursor node { id slug title artist { name } image { url width height } priceFrom { amount currencyCode } } }
    }
  }`,
  artwork: `{
    artwork(slug: "melencolia-i") {
      id slug title fullTitle date medium dimensions classification department culture period creditLine accessionNumber museumUrl
      artist { name bio nationality beginYear endYear }
      image { url width height scanWidth scanHeight }
      sizes { size paper { width height } image { width height } ppi available unavailableReason requiredPixels variantId sku price { amount currencyCode } }
      priceFrom { amount currencyCode }
      story {
        title lede updatedAt sources { label url }
        blocks {
          ... on HeadingBlock { level text { text bold italic href } }
          ... on ParagraphBlock { text { text bold italic href } }
          ... on QuoteBlock { text { text bold italic href } }
        }
      }
    }
  }`,
  collection: `{
    collection(slug: "prints") {
      name
      artworks(first: 48) { totalCount pageInfo { hasNextPage endCursor } edges { cursor node { slug title image { url } priceFrom { amount currencyCode } } } }
    }
  }`,
  curation: `{ curation(slug: "durer-and-the-occult") { title intro artworks { slug title image { url width height } priceFrom { amount currencyCode } } } }`,
};

/** Shapes no page needs, each one a fan-out across services. */
const fanOuts = {
  everyCurationsStories: `{ curations { artworks { story { blocks { ... on ParagraphBlock { text { text } } } } } } }`,
  everyCollectionsPage: `{ collections { artworks(first: 48) { edges { node { title sizes { price { amount } } } } } } }`,
  storiesInAListing: `{ artworks(first: 48) { edges { node { story { blocks { ... on ParagraphBlock { text { text } } } } } } } }`,
};

/**
 * The store's own operations, read from its source: what its pages read on the
 * server, and what they send from the browser. An operation the store adds is
 * priced here before it can meet the limit in production.
 */
const STORE_OPERATIONS = ['gateway', 'live'].map((folder) =>
  fileURLToPath(new URL(`../../../../apps/store/src/${folder}/operations/`, import.meta.url)),
);

const SCALAR_SAMPLES: Record<string, unknown> = { Int: 1, Float: 1, Boolean: true };

/** A value the type accepts, so an operation is priced with variables it could be sent. */
function sampleOf(type: GraphQLInputType): unknown {
  if (isNonNullType(type)) return sampleOf(type.ofType);
  if (isListType(type)) return [sampleOf(type.ofType)];
  if (isEnumType(type)) return type.getValues()[0]?.name;
  if (isInputObjectType(type)) {
    return Object.fromEntries(
      Object.values(type.getFields()).map((field) => [field.name, sampleOf(field.type)]),
    );
  }
  return SCALAR_SAMPLES[type.name] ?? 'a-slug';
}

function variablesOf(schema: GraphQLSchema, operation: OperationDefinitionNode) {
  return Object.fromEntries(
    (operation.variableDefinitions ?? []).map(({ variable, type }) => {
      const input = typeFromAST(schema, type);
      if (!isInputType(input)) throw new Error(`$${variable.name.value} has no input type`);
      return [variable.name.value, sampleOf(input)];
    }),
  );
}

async function storeOperations(schema: GraphQLSchema) {
  const documents = await Promise.all(
    STORE_OPERATIONS.map(async (folder) => {
      const files = (await readdir(folder)).filter((file) => file.endsWith('.graphql'));
      const sources = await Promise.all(files.map((file) => readFile(join(folder, file), 'utf8')));
      // One document a folder, so every operation finds the fragments it spreads.
      return parse(sources.join('\n'));
    }),
  );
  return documents.flatMap((document) =>
    document.definitions
      .filter(
        (definition): definition is OperationDefinitionNode =>
          definition.kind === Kind.OPERATION_DEFINITION,
      )
      .map((operation) => ({
        name: operation.name?.value ?? 'anonymous',
        document,
        variables: variablesOf(schema, operation),
      })),
  );
}

describe('query complexity', () => {
  let schema: GraphQLSchema;
  let operations: { name: string; document: DocumentNode; variables: Record<string, unknown> }[];

  beforeAll(async () => {
    schema = await buildGatewaySchema();
    operations = await storeOperations(schema);
  });

  it('lets every operation the store sends through, with room to spare', () => {
    expect(operations.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['Catalogue', 'Home', 'Work', 'CartPage', 'PlaceOrder', 'DropLive']),
    );
    const costs = Object.fromEntries(
      operations.map(({ name, document, variables }) => [
        name,
        queryComplexity(schema, document, variables, name),
      ]),
    );
    for (const [name, cost] of Object.entries(costs)) {
      expect(cost, name).toBeLessThan(MAX_QUERY_COMPLEXITY * 0.75);
    }
  });

  it.each(Object.entries(storePages))('lets the %s page through', (_name, query) => {
    expect(queryComplexity(schema, parse(query))).toBeLessThan(MAX_QUERY_COMPLEXITY / 2);
  });

  it.each(Object.entries(fanOuts))('prices %s above the limit', (_name, query) => {
    expect(queryComplexity(schema, parse(query))).toBeGreaterThan(MAX_QUERY_COMPLEXITY);
  });

  it('prices a page by the size asked for, even when it comes from a variable', () => {
    const page = parse(
      'query Page($first: Int) { artworks(first: $first) { edges { node { title } } } }',
    );

    const small = queryComplexity(schema, page, { first: 2 });
    const large = queryComplexity(schema, page, { first: 48 });
    const omitted = queryComplexity(schema, page, {});

    expect(large).toBeGreaterThan(small * 10);
    // Left out, the page has its default size of 24.
    expect(omitted).toBeGreaterThan(small);
    expect(omitted).toBeLessThan(large);
  });

  it('caps the price of a page at the largest page allowed', () => {
    const page = parse(
      'query Page($first: Int) { artworks(first: $first) { edges { node { title } } } }',
    );
    expect(queryComplexity(schema, page, { first: 10_000 })).toBe(
      queryComplexity(schema, page, { first: 48 }),
    );
  });
});
