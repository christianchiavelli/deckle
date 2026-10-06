import { ApolloServerErrorCode } from '@apollo/server/errors';
import { type ArgumentMetadata, StandardSchemaValidationPipe } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import type { z } from 'zod';

/**
 * Validates resolver arguments with a schema, the way `@Body({ schema })` does
 * for HTTP routes. `@Args()` has no `schema` option, so the schema travels with
 * the pipe; a rejection is a GraphQL `BAD_USER_INPUT` error, not an HTTP 400.
 */
export class ArgsSchemaPipe extends StandardSchemaValidationPipe {
  constructor(private readonly schema: z.ZodType) {
    super();
    this.exceptionFactory = (issues) =>
      new GraphQLError(this.formatIssueMessages(issues).join('; '), {
        extensions: { code: ApolloServerErrorCode.BAD_USER_INPUT },
      });
  }

  override transform<T = unknown>(value: T, metadata: ArgumentMetadata): Promise<T> {
    return super.transform(value, { ...metadata, schema: this.schema });
  }
}
