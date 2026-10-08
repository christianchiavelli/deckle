'use client';

import { createContext, type ReactNode, useContext, useMemo, useRef, useState } from 'react';

/** The print just put in the cart, as the sheet under the header shows it. */
export interface AddedPrint {
  /** Counts each add, so adding the same print again shows the sheet afresh. */
  readonly key: number;
  readonly image: { readonly src: string; readonly width: number; readonly height: number } | null;
  readonly title: string;
  /** "A3, unframed · $90". */
  readonly detail: string;
  /** "2 prints in your cart · $180". */
  readonly summary: string;
}

interface Added {
  readonly print: AddedPrint | null;
  readonly show: (print: Omit<AddedPrint, 'key'>) => void;
  readonly dismiss: () => void;
}

const AddedContext = createContext<Added>({
  print: null,
  show: () => undefined,
  dismiss: () => undefined,
});

/**
 * What was just added, shared between the work page that adds it and the
 * header that shows it: two islands, one sheet.
 */
export function AddedProvider({ children }: { children: ReactNode }) {
  const [print, setPrint] = useState<AddedPrint | null>(null);
  const adds = useRef(0);
  const value = useMemo<Added>(
    () => ({
      print,
      show: (next) => {
        adds.current += 1;
        setPrint({ ...next, key: adds.current });
      },
      dismiss: () => {
        setPrint(null);
      },
    }),
    [print],
  );
  return <AddedContext value={value}>{children}</AddedContext>;
}

export function useAdded(): Added {
  return useContext(AddedContext);
}
