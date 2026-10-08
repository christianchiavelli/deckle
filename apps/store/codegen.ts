import type { CodegenConfig } from '@graphql-codegen/cli';

const SCALARS = { DateTime: 'string', ID: 'string' } as const;

/**
 * Types for the store's operations, from the gateway's committed schema. The
 * output is committed too: `schema:check` fails CI when it no longer matches
 * the operations or the schema, so a breaking change shows up here first.
 */
const config: CodegenConfig = {
  schema: '../../services/gateway/schema.gql',
  generates: {
    // What the server reads, cached and tagged: a typed fetch, no client library.
    'src/gateway/generated.ts': {
      documents: ['src/gateway/operations/*.graphql'],
      plugins: ['typescript-operations', 'typed-document-node'],
      config: {
        // The server sends the operation as text, so a document is its string.
        documentMode: 'string',
        enumsAsTypes: true,
        useTypeImports: true,
        avoidOptionals: true,
        skipTypename: true,
        strictScalars: true,
        scalars: SCALARS,
      },
    },
    // What the browser's islands read and change through Apollo Client, which
    // takes a document as its syntax tree and adds `__typename` everywhere but
    // the root, as Apollo's own setup for codegen does.
    'src/live/generated.ts': {
      documents: ['src/live/operations/*.graphql'],
      plugins: ['typescript-operations', 'typed-document-node'],
      config: {
        enumsAsTypes: true,
        useTypeImports: true,
        avoidOptionals: { field: true, inputValue: false },
        nonOptionalTypename: true,
        skipTypeNameForRoot: true,
        strictScalars: true,
        scalars: SCALARS,
      },
    },
  },
};

export default config;
