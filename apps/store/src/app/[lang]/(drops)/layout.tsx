import type { ReactNode } from 'react';
import { Chrome } from '../../../components/chrome';

/** The drops and how they work, under Drops in the menu. */
export default function DropsLayout({ children }: { children: ReactNode }) {
  return <Chrome current="drops">{children}</Chrome>;
}
