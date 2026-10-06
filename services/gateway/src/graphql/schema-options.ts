import type { BuildSchemaOptions } from '@nestjs/graphql';

/**
 * How the code-first schema is built: shared by the running server and by the
 * script that writes `schema.gql`, so the committed contract is what is served.
 */
export const GATEWAY_SCHEMA_OPTIONS: BuildSchemaOptions = {
  noDuplicatedFields: true,
};
