import type { Metadata } from 'next';
import { getCopy } from '../../../../copy/server';
import { CartLive } from '../../../../live/cart-page';

export async function generateMetadata(): Promise<Metadata> {
  const { cart: text } = await getCopy();
  return { title: text.title };
}

/** The cart, as approved: its prints, what they come to, and the way to pay. */
export default function CartPage() {
  return <CartLive />;
}
