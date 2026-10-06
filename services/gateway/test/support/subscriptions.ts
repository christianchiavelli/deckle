import { type Client, createClient } from 'graphql-ws';
import WebSocket from 'ws';

/** The GraphQL WebSocket endpoint of a gateway listening at `httpUrl`. */
export const graphqlWsUrl = (httpUrl: string) => `${httpUrl.replace(/^http/, 'ws')}/graphql`;

/** A WebSocket that announces another site's page as its origin, as a browser on that site would. */
export class ForeignOriginWebSocket extends WebSocket {
  constructor(address: string | URL, protocols?: string | string[]) {
    super(address, protocols, { headers: { origin: 'https://elsewhere.example' } });
  }
}

export function subscriptionClient(httpUrl: string, webSocketImpl: unknown = WebSocket): Client {
  return createClient({ url: graphqlWsUrl(httpUrl), webSocketImpl, retryAttempts: 0, lazy: true });
}
