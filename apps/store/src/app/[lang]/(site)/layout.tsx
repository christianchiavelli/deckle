import type { ReactNode } from 'react';
import { Chrome } from '../../components/chrome';

/** The pages in no section of the menu: the front page, the search, and how the shop works. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <Chrome>{children}</Chrome>;
}
