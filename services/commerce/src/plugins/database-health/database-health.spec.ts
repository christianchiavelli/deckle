import type { MiddlewareConsumer } from '@nestjs/common';
import type { TransactionalConnection } from '@vendure/core';
import { describe, expect, it, vi } from 'vitest';
import { databaseAnswers, serveWorkerHealth, type QueryableConnection } from './database-health.js';
import { DatabaseHealthPlugin } from './database-health.plugin.js';

const answering: QueryableConnection = {
  rawConnection: { query: () => Promise.resolve([{ '?column?': 1 }]) },
};
const failing: QueryableConnection = {
  rawConnection: { query: () => Promise.reject(new Error('connection terminated')) },
};
const hanging: QueryableConnection = {
  rawConnection: { query: () => new Promise(() => undefined) },
};

describe('databaseAnswers', () => {
  it('is true when Postgres answers, false when it fails or takes too long', async () => {
    await expect(databaseAnswers(answering, 100)).resolves.toBe(true);
    await expect(databaseAnswers(failing, 100)).resolves.toBe(false);
    await expect(databaseAnswers(hanging, 20)).resolves.toBe(false);
  });
});

describe('serveWorkerHealth', () => {
  it('answers /health with the state of the database, and nothing else', async () => {
    let connection = answering;
    const server = await serveWorkerHealth(
      { rawConnection: { query: (sql) => connection.rawConnection.query(sql) } },
      { port: 0, hostname: '127.0.0.1', timeoutMs: 50 },
    );
    try {
      const url = `http://127.0.0.1:${server.port}`;
      const healthy = await fetch(`${url}/health`);
      expect([healthy.status, await healthy.json()]).toEqual([200, { status: 'ok' }]);
      connection = failing;
      const down = await fetch(`${url}/health`);
      expect([down.status, await down.json()]).toEqual([
        503,
        { status: 'error', database: 'down' },
      ]);
      expect((await fetch(`${url}/metrics`)).status).toBe(404);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe('DatabaseHealthPlugin', () => {
  function middlewareFor(connection: QueryableConnection) {
    let middleware: ((request: unknown, response: unknown, next: () => void) => void) | undefined;
    const consumer = {
      apply: (handler: typeof middleware) => {
        middleware = handler;
        return {
          forRoutes: (route: string) => {
            expect(route).toBe('health');
            return consumer;
          },
        };
      },
    };
    new DatabaseHealthPlugin(connection as TransactionalConnection).configure(
      consumer as unknown as MiddlewareConsumer,
    );
    if (!middleware) {
      throw new Error('no middleware registered');
    }
    return middleware;
  }

  it("hands over to Vendure's /health when Postgres answers", async () => {
    const next = vi.fn();
    middlewareFor(answering)({}, {}, next);
    await vi.waitFor(() => {
      expect(next).toHaveBeenCalledOnce();
    });
  });

  it('answers 503 itself when Postgres does not', async () => {
    const response = { statusCode: 0, setHeader: vi.fn(), end: vi.fn() };
    const next = vi.fn();
    middlewareFor(failing)({}, response, next);
    await vi.waitFor(() => {
      expect(response.end).toHaveBeenCalledWith(
        JSON.stringify({ status: 'error', database: 'down' }),
      );
    });
    expect(response.statusCode).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });
});
