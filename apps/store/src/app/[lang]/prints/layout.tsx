import type { ReactNode } from 'react';
import { Chrome } from '../../components/chrome';

/** The prints and each work's page, under Prints in the menu. */
export default function PrintsLayout({ children }: { children: ReactNode }) {
  return <Chrome current="prints">{children}</Chrome>;
}
