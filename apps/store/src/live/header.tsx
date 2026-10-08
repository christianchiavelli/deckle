'use client';

import { useQuery } from '@apollo/client/react';
import { AddedToCart } from '@deckle/ui';
import { usePathname } from 'next/navigation';
import { type KeyboardEvent, useEffect, useEffectEvent, useRef } from 'react';
import { useCopy } from '../copy/client';
import { useAdded } from './added';
import { HeaderStateDocument } from './generated';

export interface HeaderState {
  /** Null until the browser has asked: the badge waits rather than showing a wrong count. */
  readonly cartCount: number | null;
  readonly signedIn: boolean;
}

/** How many prints this browser's cart holds, and whether it is signed in. */
export function useHeaderState(): HeaderState {
  const { data } = useQuery(HeaderStateDocument, { ssr: false });
  return { cartCount: data?.cart.quantity ?? null, signedIn: Boolean(data?.viewer) };
}

/**
 * The sheet under the header after "Add to cart". It takes focus so a screen
 * reader says what happened, closes with Escape or its button, and goes away
 * when the reader moves to another page.
 */
export function AddedSheet() {
  const copy = useCopy();
  const { print, dismiss } = useAdded();
  const sheet = useRef<HTMLElement>(null);
  const path = usePathname();
  const shownOn = useRef(path);

  const shown = useEffectEvent(() => {
    shownOn.current = path;
    sheet.current?.focus();
  });
  const moved = useEffectEvent(() => {
    if (path !== shownOn.current) {
      dismiss();
    }
  });

  useEffect(() => {
    if (print !== null) {
      shown();
    }
  }, [print]);

  useEffect(() => {
    moved();
  }, [path]);

  if (print === null) {
    return null;
  }
  return (
    <AddedToCart
      key={print.key}
      ref={sheet}
      tabIndex={-1}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          dismiss();
        }
      }}
      id="added-title"
      title={copy.added.title}
      print={{ image: print.image, title: print.title, detail: print.detail }}
      summary={print.summary}
      cart={{ href: copy.path('/cart'), label: copy.added.cart }}
      checkout={{ href: copy.path('/checkout'), label: copy.added.checkout }}
      close={{ label: copy.added.close, onClick: dismiss }}
    />
  );
}
