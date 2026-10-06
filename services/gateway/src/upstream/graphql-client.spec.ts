import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { GraphQLClient } from './graphql-client.js';
import {
  UpstreamContractError,
  UpstreamGraphQLError,
  UpstreamHttpError,
  UpstreamUnavailableError,
} from './upstream-errors.js';

type Handler = (request: IncomingMessage, response: ServerResponse, attempt: number) => void;

let server: Server | undefined;

afterEach(async () => {
  await new Promise<void>((resolve) => {
    if (server === undefined) {
      resolve();
      return;
    }
    server.closeAllConnections();
    server.close(() => {
      resolve();
    });
    server = undefined;
  });
});

/** A one-off upstream; `attempt` counts the requests it has received. */
async function upstream(handle: Handler): Promise<string> {
  let attempt = 0;
  const listening = createServer((request, response) => {
    attempt++;
    request.resume();
    request.on('end', () => {
      handle(request, response, attempt);
    });
  });
  server = listening;
  await new Promise<void>((resolve) => listening.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(listening.address() as AddressInfo).port}/graphql`;
}

const respond = (response: ServerResponse, status: number, body: unknown) =>
  response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));

const operation = {
  operationName: 'Products',
  document: 'query Products { products { totalItems } }',
  data: z.object({ products: z.object({ totalItems: z.int() }) }),
};

const client = (url: string, timeoutMs = 2000) =>
  new GraphQLClient({ service: 'commerce', url, timeoutMs });

describe('GraphQLClient', () => {
  it('returns `data` parsed by the operation schema', async () => {
    const url = await upstream((_request, response) => {
      respond(response, 200, { data: { products: { totalItems: 4 } } });
    });

    await expect(client(url).query(operation)).resolves.toEqual({ products: { totalItems: 4 } });
  });

  it('reads a 400 that carries GraphQL errors as GraphQL errors, the way Vendure answers them', async () => {
    const url = await upstream((_request, response) => {
      respond(response, 400, {
        errors: [
          {
            message: 'Cannot query field "productz"',
            extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
          },
        ],
      });
    });

    const failure = await client(url)
      .query(operation)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(UpstreamGraphQLError);
    expect(failure).toMatchObject({
      service: 'commerce',
      operationName: 'Products',
      issues: [{ message: 'Cannot query field "productz"', code: 'GRAPHQL_VALIDATION_FAILED' }],
    });
  });

  it('reads errors in a 200 the same way', async () => {
    const url = await upstream((_request, response) => {
      respond(response, 200, { data: null, errors: [{ message: 'Forbidden' }] });
    });

    await expect(client(url).query(operation)).rejects.toMatchObject({
      issues: [{ message: 'Forbidden', code: null }],
    });
  });

  it('treats a 400 without a GraphQL body as a broken exchange', async () => {
    const url = await upstream((_request, response) => {
      response.writeHead(400, { 'content-type': 'text/html' }).end('<h1>Bad request</h1>');
    });

    await expect(client(url).query(operation)).rejects.toBeInstanceOf(UpstreamHttpError);
  });

  it('reports a server error as the upstream being unavailable', async () => {
    const url = await upstream((_request, response) => {
      respond(response, 502, { error: 'bad gateway' });
    });

    await expect(client(url).query(operation)).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it('refuses data in a shape it was not built for', async () => {
    const url = await upstream((_request, response) => {
      respond(response, 200, { data: { products: { totalItems: 'four' } } });
    });

    await expect(client(url).query(operation)).rejects.toBeInstanceOf(UpstreamContractError);
  });

  it('retries a query once when the connection drops', async () => {
    const url = await upstream((request, response, attempt) => {
      if (attempt === 1) {
        request.socket.destroy();
        return;
      }
      respond(response, 200, { data: { products: { totalItems: 4 } } });
    });

    await expect(client(url).query(operation)).resolves.toEqual({ products: { totalItems: 4 } });
  });

  it('never retries a mutation, which may have run before the connection dropped', async () => {
    let attempts = 0;
    const url = await upstream((request, _response, attempt) => {
      attempts = attempt;
      request.socket.destroy();
    });

    await expect(client(url).mutate(operation)).rejects.toBeInstanceOf(UpstreamUnavailableError);
    expect(attempts).toBe(1);
  });

  it('gives up on a slow upstream at the deadline, without retrying', async () => {
    let attempts = 0;
    const url = await upstream((_request, _response, attempt) => {
      attempts = attempt;
      // Never answers.
    });

    const failure = await client(url, 100)
      .query(operation)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(UpstreamUnavailableError);
    expect((failure as Error).message).toBe('commerce: no answer within 100 ms');
    expect(attempts).toBe(1);
  });

  it('sends the operation name, the variables and its headers', async () => {
    let received: { headers: IncomingMessage['headers']; body: string } | undefined;
    const listening = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => {
        received = { headers: request.headers, body: Buffer.concat(chunks).toString() };
        respond(response, 200, { data: { products: { totalItems: 1 } } });
      });
    });
    server = listening;
    await new Promise<void>((resolve) => listening.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(listening.address() as AddressInfo).port}/graphql`;

    await new GraphQLClient({
      service: 'commerce',
      url,
      timeoutMs: 1000,
      headers: { 'vendure-api-key': 'k' },
    }).query({
      ...operation,
      variables: { take: 2 },
    });

    expect(JSON.parse(received?.body ?? '')).toEqual({
      operationName: 'Products',
      query: operation.document,
      variables: { take: 2 },
    });
    expect(received?.headers).toMatchObject({
      'content-type': 'application/json',
      'vendure-api-key': 'k',
    });
  });
});
