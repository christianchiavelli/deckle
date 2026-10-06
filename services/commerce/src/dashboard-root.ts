import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Express middleware that sends a request for the server's root to the dashboard.
 * Commerce publishes its host port for the dashboard alone, and the root answered
 * with Nest's JSON 404; the CMS sends its root to its admin the same way.
 */
export function redirectRootTo(location: string) {
  return (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    if (request.url !== '/') {
      next();
      return;
    }
    response.writeHead(302, { Location: location }).end();
  };
}
