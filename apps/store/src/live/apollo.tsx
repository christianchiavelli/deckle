'use client';

import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { ApolloProvider } from '@apollo/client/react';
import { OperationTypeNode } from 'graphql';
import { createClient } from 'graphql-ws';
import { type ReactNode, useState } from 'react';
import { useCopy } from '../copy/client';

/** The gateway, on the store's own origin: Caddy routes it, so the session cookie goes along. */
const ENDPOINT = '/graphql';

export function makeCache(): InMemoryCache {
  return new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // The order just placed is already in the cache, under its code: the
          // confirmation reads it there instead of asking again. An answer the
          // gateway gave for the code, even null, stands as given.
          order: {
            read: (existing: unknown, { args, toReference }) =>
              existing !== undefined || typeof args?.['code'] !== 'string'
                ? existing
                : toReference({ __typename: 'PlacedOrder', code: args['code'] }),
          },
        },
      },
      // A browser has one cart: every answer that carries it replaces it everywhere,
      // the header's count included.
      Cart: { keyFields: [] },
      Artwork: { keyFields: ['slug'] },
      // The stock is replaced whole by each change the gateway pushes.
      Drop: { keyFields: ['slug'], fields: { stock: { merge: false } } },
      // An account holds one copy of a drop at most.
      DropCopy: { keyFields: ['drop'] },
      PlacedOrder: { keyFields: ['code'] },
      Country: { keyFields: ['code'] },
    },
  });
}

/**
 * Queries and changes go over HTTP; a drop's live count over a WebSocket, which
 * opens with the first subscription and closes with the last. On the server
 * nothing is ever sent: the islands render their waiting state there, and ask
 * once they are in the browser, where the cookie is. Each request names the
 * page's language, so the CMS's words come in the page's edition, whatever
 * the browser's own setting.
 */
function makeClient(language: string): ApolloClient {
  const http = new HttpLink({
    uri: ENDPOINT,
    credentials: 'same-origin',
    headers: { 'accept-language': language },
  });
  if (typeof window === 'undefined') {
    return new ApolloClient({ link: http, cache: makeCache(), ssrMode: true });
  }
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const socket = new GraphQLWsLink(
    createClient({ url: `${scheme}://${window.location.host}${ENDPOINT}`, lazy: true }),
  );
  return new ApolloClient({
    link: ApolloLink.split(
      (operation) => operation.operationType === OperationTypeNode.SUBSCRIPTION,
      socket,
      http,
    ),
    cache: makeCache(),
  });
}

/** One client per page load in the browser, and one per request on the server. */
export function StoreApollo({ children }: { children: ReactNode }) {
  const { htmlLang } = useCopy();
  const [client] = useState(() => makeClient(htmlLang));
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
