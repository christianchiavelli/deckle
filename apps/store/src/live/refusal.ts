import { CombinedGraphQLErrors } from '@apollo/client';

export interface Refusal {
  /** The gateway's `extensions.code`, such as `NO_COPY_OPEN` or `BAD_USER_INPUT`. */
  readonly code: string;
  readonly extensions: Readonly<Record<string, unknown>>;
}

/**
 * Why the gateway turned a request down, when it said so: a refusal the page
 * can act on. Null for anything else, such as the network failing, which
 * every island answers with the same "try again".
 */
export function refusalOf(error: unknown): Refusal | null {
  if (!CombinedGraphQLErrors.is(error)) {
    return null;
  }
  const extensions = error.errors[0]?.extensions ?? {};
  const code = extensions['code'];
  return typeof code === 'string' ? { code, extensions } : null;
}
