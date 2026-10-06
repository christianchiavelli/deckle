import type { Payload } from 'payload';
import { releaseInterruptedDeliveries } from './webhooks/task';

/** Runs once per Payload instance, after the database is connected and migrated. */
export async function onPayloadInit(payload: Payload): Promise<void> {
  // node-postgres reports a failed idle connection on the pool, and an
  // unheard 'error' event ends the process: a Postgres restart would take the
  // CMS down with it. Heard, the pool simply opens a new connection later.
  payload.db.pool.on('error', (error) => {
    payload.logger.error({ err: error, msg: 'An idle Postgres connection failed' });
  });
  await releaseInterruptedDeliveries(payload);
  if (process.env.NODE_ENV === 'production') {
    stopJobsOnShutdown(payload);
  }
}

/**
 * On SIGTERM, Next.js stops accepting requests, drains the open ones and
 * exits. The jobs runner lives in the same process, so it stops first: a
 * delivery started in that window could be cut off halfway.
 */
function stopJobsOnShutdown(payload: Payload): void {
  const stopCrons = () => {
    for (const cron of payload.crons.splice(0)) {
      cron.stop();
    }
  };
  process.once('SIGTERM', stopCrons);
  process.once('SIGINT', stopCrons);
}
