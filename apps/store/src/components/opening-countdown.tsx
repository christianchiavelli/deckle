'use client';

import { Countdown } from '@deckle/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { copy } from '../copy';
import { untilOpening } from '../views/time';
import { useNow } from './clock';

export interface OpeningCountdownProps {
  readonly opensAt: string;
  /** When the server drew the page, so the first render in the browser matches it. */
  readonly now: number;
}

/**
 * Days, hours and minutes to a drop's hour, kept current in the browser. When
 * it reaches zero the page is drawn again by the server, which now says open.
 */
export function OpeningCountdown({ opensAt, now }: OpeningCountdownProps) {
  const router = useRouter();
  const clock = useNow(now, 1000);
  const left = Date.parse(opensAt) - clock;
  const view = untilOpening(left, copy);
  const opened = left <= 0;

  useEffect(() => {
    if (opened) {
      router.refresh();
    }
  }, [opened, router]);

  return <Countdown label={view.label} units={view.units} />;
}
