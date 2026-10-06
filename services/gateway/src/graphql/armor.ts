import { ApolloArmor } from '@escape.tech/graphql-armor';
import type { ApolloDriverConfig } from '@nestjs/apollo';

/**
 * The deepest page the store builds is six fields down (a collection's works:
 * collection → artworks → edges → node → image → url); one more level of room.
 * Fields are counted, not the fragments a client groups them in: a fragment
 * adds no data to resolve, and GraphQL's own validation refuses one that cycles.
 */
export const MAX_DEPTH = 7;
/**
 * Parsing itself costs CPU: a document longer than any real query is refused
 * while it is parsed. graphql-js enforces it (Apollo's `parseOptions`), which
 * answers 400; armor's own token plugin throws from a hook Apollo Server 5 treats
 * as an internal failure, and so answers a client's mistake with a 500.
 */
export const MAX_TOKENS = 2000;

type ApolloPlugin = NonNullable<ApolloDriverConfig['plugins']>[number];

/**
 * Limits on the shape of an operation, checked while it is parsed and validated.
 * The cost of an operation is priced separately (query-complexity.ts), from the
 * schema's own estimates, so armor's generic cost limit stays off.
 */
export function armorProtection(production: boolean) {
  const protection = new ApolloArmor({
    costLimit: { enabled: false },
    maxDepth: { n: MAX_DEPTH, flattenFragments: true },
    maxAliases: { n: 15 },
    maxDirectives: { n: 10 },
    maxTokens: { enabled: false },
    // "Did you mean ...?" helps a developer and maps the schema for anyone else.
    blockFieldSuggestion: { enabled: production },
  }).protect();
  return {
    ...protection,
    plugins: asApolloPlugins(protection.plugins),
  };
}

/**
 * graphql-armor publishes CommonJS declarations, so its plugins are typed against
 * Apollo Server's CommonJS declaration files, while this ESM package (and Nest)
 * sees the ESM ones. Both describe the same objects, but a private brand on
 * Apollo's `HeaderMap` makes the two copies incompatible to the compiler.
 */
function asApolloPlugins(plugins: readonly object[]): ApolloPlugin[] {
  return plugins as ApolloPlugin[];
}
