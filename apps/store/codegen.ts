import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * Types for the store's operations, from the gateway's committed schema. The
 * output is committed too: `schema:check` fails CI when it no longer matches
 * the operations or the schema, so a breaking change shows up here first.
 */
const config: CodegenConfig = {
  schema: '../../services/gateway/schema.gql',
  documents: ['src/gateway/operations/*.graphql'],
  generates: {
    'src/gateway/generated.ts': {
      plugins: ['typescript-operations', 'typed-document-node'],
      config: {
        // The server sends the operation as text, so a document is its string.
        documentMode: 'string',
        enumsAsTypes: true,
        useTypeImports: true,
        avoidOptionals: true,
        skipTypename: true,
        strictScalars: true,
        scalars: { DateTime: 'string', ID: 'string' },
      },
    },
  },
};

export default config;
