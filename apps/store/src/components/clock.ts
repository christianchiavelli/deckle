'use client';

import { useSyncExternalStore } from 'react';

/**
 * The browser's time, read again every `every` milliseconds. While the page
 * hydrates it is the server's `serverNow`, so the first render matches the
 * HTML it was sent; the browser's own clock takes over the moment after.
 */
export function useNow(serverNow: number, every: number): number {
  return useSyncExternalStore(
    (changed) => {
      const timer = setInterval(changed, every);
      return () => {
        clearInterval(timer);
      };
    },
    // The same value until the next tick, as React asks of a snapshot.
    () => Math.floor(Date.now() / every) * every,
    () => serverNow,
  );
}
