import type { ReactNode } from 'react';
import { Chrome } from '../../components/chrome';

/** The journal, under Journal in the menu. */
export default function JournalLayout({ children }: { children: ReactNode }) {
  return <Chrome current="journal">{children}</Chrome>;
}
