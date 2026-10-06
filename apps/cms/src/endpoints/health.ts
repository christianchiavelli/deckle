import type { Endpoint } from 'payload';

const noStore = { 'cache-control': 'no-store' };

/**
 * `GET /api/health`: answers 200 once Payload is up and Postgres answers a
 * query, 503 otherwise. Payload initialises before any route runs, so a 200
 * also means the migrations have been applied.
 */
export const healthEndpoint: Endpoint = {
  path: '/health',
  method: 'get',
  handler: async (req) => {
    try {
      await req.payload.db.pool.query('select 1');
      return Response.json({ status: 'ok' }, { headers: noStore });
    } catch (error) {
      req.payload.logger.error({ err: error, msg: 'Health check failed: Postgres did not answer' });
      return Response.json({ status: 'unavailable' }, { status: 503, headers: noStore });
    }
  },
};
