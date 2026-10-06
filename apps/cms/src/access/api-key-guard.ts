const readMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Payload's API-key scheme: `Authorization: <collection> API-Key <key>`. */
const apiKeyScheme = /^\S+ API-Key \S/;

/**
 * Whether a request authenticates with an API key and tries to change
 * something. API keys here belong to machines that only read (the gateway),
 * and Payload's own collections, such as document locks and preferences, let
 * any signed-in user write, so the rule is enforced in front of the whole API
 * rather than collection by collection.
 *
 * Payload also reads a POST that carries `X-Payload-HTTP-Method-Override: GET`
 * (or `X-HTTP-Method-Override`) as a GET, for queries too long for a URL.
 */
export function isApiKeyWrite(method: string, headers: Headers): boolean {
  const authorization = headers.get('authorization');
  if (!authorization || !apiKeyScheme.test(authorization)) {
    return false;
  }
  const override =
    headers.get('x-payload-http-method-override') ?? headers.get('x-http-method-override');
  const effective = method.toUpperCase() === 'POST' && override === 'GET' ? 'GET' : method;
  return !readMethods.has(effective.toUpperCase());
}
