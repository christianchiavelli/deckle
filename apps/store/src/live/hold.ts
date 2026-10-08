import type { CopyViewFragment } from './generated';

/** When this browser first read each hold, by the hold's own deadline. */
const firstRead = new Map<string, number>();

/**
 * When a held copy runs out, by this browser's clock. The gateway gives the
 * seconds left by the database's clock; they are counted from the moment the
 * answer was first read, so a browser whose clock is off still shows the
 * minutes the database will honour. The same hold read again keeps its
 * deadline, so a refetch never makes the clock jump.
 */
export function deadlineOf(copy: CopyViewFragment, now: number): number | null {
  if (copy.state !== 'HELD' || copy.secondsLeft === null || copy.heldUntil === null) {
    return null;
  }
  const key = `${copy.drop}#${String(copy.number)}#${copy.heldUntil}`;
  const read = firstRead.get(key) ?? now;
  firstRead.set(key, read);
  return read + copy.secondsLeft * 1000;
}
