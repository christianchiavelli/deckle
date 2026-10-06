import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Express middleware for the Admin API that never sends the session token in a
 * response header.
 *
 * Vendure's `tokenMethod` is one setting for both APIs. The Shop API needs `bearer`
 * (the gateway keeps its customers' tokens server side), and with `bearer` on,
 * Vendure also returns every Admin API login's token in a header, which the dashboard
 * stores in localStorage, where any script injected into the page could read it.
 * Withholding the header leaves the dashboard on its HttpOnly, SameSite=Strict
 * cookie; the gateway uses an API key on this API and never needs the header.
 */
export function withholdSessionTokenHeader(headerName: string) {
  const withheld = headerName.toLowerCase();
  return (_request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    const setHeader = response.setHeader.bind(response);
    response.setHeader = (name, value) =>
      name.toLowerCase() === withheld ? response : setHeader(name, value);
    next();
  };
}
