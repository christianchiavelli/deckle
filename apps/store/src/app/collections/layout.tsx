import type { ReactNode } from 'react';
import { Chrome } from '../../components/chrome';

/** The collections and each one's page, under Collections in the menu. */
export default function CollectionsLayout({ children }: { children: ReactNode }) {
  return <Chrome current="collections">{children}</Chrome>;
}
