import { connection } from 'next/server';

/**
 * The time of this request, for what a drop's hour decides: whether it is open,
 * how long until it is. Waiting on the request first is what lets a page read
 * the clock at all: whatever reads it renders on request, never into a shell
 * built ahead of time.
 */
export async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}
