import type { Metadata } from 'next';
import { copy } from '../../../copy';
import { CartLive } from '../../../live/cart-page';

export const metadata: Metadata = { title: copy.cart.title };

/** The cart, as approved: its prints, what they come to, and the way to pay. */
export default function CartPage() {
  return <CartLive />;
}
