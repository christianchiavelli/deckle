import type { ReactNode } from 'react';
import { Chrome } from '../../../components/chrome';

/** A drop's own page, under Drops in the menu, without the line that would point to itself. */
export default function DropLayout({ children }: { children: ReactNode }) {
  return (
    <Chrome current="drops" announcement={false}>
      {children}
    </Chrome>
  );
}
