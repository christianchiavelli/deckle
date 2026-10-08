'use client';

import { createContext, type ReactNode, use } from 'react';
import { type Copy, copyOf, type Lang } from '.';

const Edition = createContext<Lang>('en');

/** Tells the browser's islands which edition the page is in. */
export function EditionProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <Edition value={lang}>{children}</Edition>;
}

/** The words of the page's edition, in a Client Component. */
export function useCopy(): Copy {
  return copyOf(use(Edition));
}
