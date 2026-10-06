import { connection } from 'next/server';

/** Liveness for the container's check: the server is up and answering, now, not at build time. */
export async function GET(): Promise<Response> {
  await connection();
  return Response.json({ status: 'ok' });
}
