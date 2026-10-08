'use client';

import { LanguageCodes } from '@deckle/ui';
import { type MouseEvent, useSyncExternalStore } from 'react';
import { copyOf } from '../copy';
import { useCopy } from '../copy/client';
import { editionNamed, editionsFromHere, editionsOf, pageOf } from '../views/editions';

/** Back and forward change the page without a request: the switch follows them. */
function onHistory(change: () => void): () => void {
  window.addEventListener('popstate', change);
  return () => {
    window.removeEventListener('popstate', change);
  };
}

/**
 * The page as the browser has it, path and query. A server rendering a shell
 * ahead of time has no address to give, so there it is none.
 */
function useHere(): string | null {
  return useSyncExternalStore(
    onHistory,
    () => `${window.location.pathname}${window.location.search}`,
    () => null,
  );
}

/**
 * The page as it stands when the reader switches, anchor too, and after a
 * move the router made without a request.
 */
function followHere(event: MouseEvent<HTMLAnchorElement>) {
  const edition = editionNamed(event.currentTarget.lang);
  if (edition !== undefined) {
    const { pathname, search, hash } = window.location;
    event.currentTarget.href = `${copyOf(edition).path(pageOf(`${pathname}${search}`))}${hash}`;
  }
}

/**
 * The header's switch to the same page in the other edition, or to `page` in
 * each. The server's HTML cannot know the address of a page whose shell is
 * built before its slug, so there each link asks the store to find the page
 * from where the browser came, which works with no script at all; once the
 * page runs, the same links lead straight there.
 */
export function EditionSwitch({ page }: { page?: string | undefined }) {
  const copy = useCopy();
  const here = useHere();
  if (page !== undefined) {
    return <LanguageCodes label={copy.chrome.language} items={editionsOf(page, copy.lang)} />;
  }
  return (
    <LanguageCodes
      label={copy.chrome.language}
      items={here === null ? editionsFromHere(copy.lang) : editionsOf(pageOf(here), copy.lang)}
      onFollow={followHere}
    />
  );
}
