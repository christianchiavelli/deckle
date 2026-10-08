'use client';

import { useMutation } from '@apollo/client/react';
import { Button, Note } from '@deckle/ui';
import { useState } from 'react';
import { copy } from '../copy';
import { moneyOf } from '../views/cart';
import { useAdded } from './added';
import { AddToCartDocument, type PaperSize } from './generated';

export interface AddToCartProps {
  readonly artwork: {
    readonly slug: string;
    readonly title: string;
    readonly image: {
      readonly src: string;
      readonly width: number;
      readonly height: number;
    } | null;
  };
  readonly size: PaperSize;
  /** "A3, unframed · $90", for the sheet that confirms it. */
  readonly detail: string;
}

/**
 * "Add to cart": one print at the size chosen. The cart that comes back
 * replaces the one the header counts, and the sheet under the header says
 * what went in.
 */
export function AddToCart({ artwork, size, detail }: AddToCartProps) {
  const { show } = useAdded();
  const [add, { loading }] = useMutation(AddToCartDocument);
  const [failed, setFailed] = useState(false);

  async function addOne() {
    setFailed(false);
    try {
      const { data } = await add({ variables: { artwork: artwork.slug, size, quantity: 1 } });
      const cart = data?.addToCart;
      if (cart) {
        show({
          image: artwork.image,
          title: artwork.title,
          detail,
          summary: copy.added.summary(cart.quantity, moneyOf(cart.subtotal, copy)),
        });
      }
    } catch {
      // A size no longer for sale reads the same as any other failure: the page
      // that offered it is out of date, and a moment later it is not.
      setFailed(true);
    }
  }

  return (
    <>
      <Button
        type="button"
        icon="bag"
        aria-busy={loading || undefined}
        disabled={loading}
        onClick={() => void addOne()}
      >
        {copy.added.add}
      </Button>
      {failed && <Note>{copy.added.failed}</Note>}
    </>
  );
}
