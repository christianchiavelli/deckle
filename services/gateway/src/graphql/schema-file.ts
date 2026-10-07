import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { type GraphQLSchema, lexicographicSortSchema, printSchema } from 'graphql';
import { AccountsResolver } from '../accounts/accounts.resolver.js';
import { ArtworksResolver } from '../catalog/artworks.resolver.js';
import { CollectionsResolver } from '../catalog/collections.resolver.js';
import { CartResolver } from '../checkout/cart.resolver.js';
import { CurationsResolver } from '../curations/curations.resolver.js';
import { DropsResolver } from '../drops/drops.resolver.js';
import { ViewerCopiesResolver } from '../drops/viewer-copies.resolver.js';
import { ArtworkChangesResolver } from '../live/artwork-changes.resolver.js';
import { ArtworkStoryResolver } from '../stories/artwork-story.resolver.js';
import { GATEWAY_SCHEMA_OPTIONS } from './schema-options.js';

/** The committed contract, at the package root. */
export const SCHEMA_FILE = fileURLToPath(new URL('../../schema.gql', import.meta.url));

/**
 * Every resolver in the schema. The served schema is built from the resolvers
 * Nest finds in its modules; a test checks both list the same, so a resolver
 * added to a module but not here fails the suite instead of the contract.
 */
export const GATEWAY_RESOLVERS = [
  ArtworksResolver,
  CollectionsResolver,
  ArtworkStoryResolver,
  CurationsResolver,
  ArtworkChangesResolver,
  AccountsResolver,
  CartResolver,
  DropsResolver,
  ViewerCopiesResolver,
];

const HEADER = `# The gateway's GraphQL contract, generated from the code-first resolvers.
# Do not edit: run \`pnpm --filter @deckle/gateway schema:generate\`.
# CI fails when this file differs from the code (schema:check) and on breaking changes (schema:diff).

`;

/** The schema the resolvers describe, built without starting the gateway. */
export async function buildGatewaySchema(): Promise<GraphQLSchema> {
  const context = await NestFactory.createApplicationContext(GraphQLSchemaBuilderModule, {
    logger: false,
  });
  try {
    return await context
      .get(GraphQLSchemaFactory)
      .create(GATEWAY_RESOLVERS, GATEWAY_SCHEMA_OPTIONS);
  } finally {
    await context.close();
  }
}

/** The schema as SDL, sorted so that a diff shows only what changed. */
export async function printGatewaySchema(): Promise<string> {
  return `${HEADER}${printSchema(lexicographicSortSchema(await buildGatewaySchema()))}\n`;
}
