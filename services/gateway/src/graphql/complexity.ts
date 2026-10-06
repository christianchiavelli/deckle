import type { ComplexityEstimatorArgs } from '@nestjs/graphql';

/**
 * What a query may cost before it runs. Every field costs 1; the fields below
 * cost more because they fan out (lists, pages) or cross to another service.
 * The ceiling lets the store's heaviest page through with room to spare and
 * refuses the shapes no page needs, such as every curation's every story.
 */
export const MAX_QUERY_COMPLEXITY = 2500;

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 48;

/** A list of about `size` items costs its item `size` times. */
export const listOf =
  (size: number) =>
  ({ childComplexity }: ComplexityEstimatorArgs): number =>
    1 + size * childComplexity;

/** A page costs its item once per item asked for, up to the page size limit. */
export function pageOf({ args, childComplexity }: ComplexityEstimatorArgs): number {
  const first: unknown = args['first'];
  const size =
    typeof first === 'number' ? Math.min(Math.max(first, 1), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  return 1 + size * childComplexity;
}

/** A field resolved by another service, batched per request but still a round trip. */
export function crossService({ childComplexity }: ComplexityEstimatorArgs): number {
  return 10 + childComplexity;
}
