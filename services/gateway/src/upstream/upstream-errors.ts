import type { z } from 'zod';

/** The services the gateway calls out to. */
export type UpstreamService = 'commerce' | 'cms' | 'store';

/** Anything that went wrong while talking to another service. */
export abstract class UpstreamError extends Error {
  constructor(
    readonly service: UpstreamService,
    message: string,
    options?: ErrorOptions,
  ) {
    super(`${service}: ${message}`, options);
  }
}

/** The service could not be reached in time: refused, reset, timed out, or answered 5xx. */
export class UpstreamUnavailableError extends UpstreamError {
  override readonly name = 'UpstreamUnavailableError';
}

/** The service answered with a status the gateway does not expect, e.g. 401 or 404. */
export class UpstreamHttpError extends UpstreamError {
  override readonly name = 'UpstreamHttpError';

  constructor(
    service: UpstreamService,
    readonly status: number,
    detail: string,
  ) {
    super(service, `answered ${status}: ${detail}`);
  }
}

export interface UpstreamGraphQLIssue {
  readonly message: string;
  readonly code: string | null;
}

/** A GraphQL service rejected the operation and said why in `errors`. */
export class UpstreamGraphQLError extends UpstreamError {
  override readonly name = 'UpstreamGraphQLError';

  constructor(
    service: UpstreamService,
    readonly operationName: string,
    readonly issues: readonly UpstreamGraphQLIssue[],
  ) {
    super(service, `${operationName} failed: ${issues.map((issue) => issue.message).join('; ')}`);
  }
}

/** The answer did not have the shape the gateway was built against: the contract drifted. */
export class UpstreamContractError extends UpstreamError {
  override readonly name = 'UpstreamContractError';

  constructor(
    service: UpstreamService,
    readonly operation: string,
    readonly zodError: z.ZodError,
  ) {
    super(service, `${operation} answered an unexpected shape: ${zodError.message}`);
  }
}
