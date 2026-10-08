'use client';

import { TrialProof } from '@deckle/ui';
import { usePathname } from 'next/navigation';
import type { MouseEvent } from 'react';
import { copy } from '../copy';
import { leaveLink } from '../preview/link';

const { preview } = copy;

/** The page as it stands when the reader leaves, query and anchor too: a story's preview is left at the story. */
function leaveFromHere(event: MouseEvent<HTMLAnchorElement>) {
  const { pathname, search, hash } = window.location;
  event.currentTarget.href = leaveLink(`${pathname}${search}${hash}`);
}

/**
 * The trial proof's frame, which a page wears in draft mode. Its way out
 * returns to the page the reader is on: the server renders it with the path,
 * and the click adds what only the browser knows.
 */
export function ProofFrame() {
  const pathname = usePathname();
  return (
    <TrialProof
      label={preview.label}
      href={leaveLink(pathname)}
      link={preview.leave}
      onLeave={leaveFromHere}
    >
      {preview.message}
    </TrialProof>
  );
}
