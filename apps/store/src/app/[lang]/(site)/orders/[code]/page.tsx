import { Band } from '@deckle/ui';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { copy } from '../../../../copy';
import { OrderLive } from '../../../../live/order-page';

export const metadata: Metadata = {
  title: copy.order.placed,
  // An order's page is one browser's own: there is nothing for a search engine.
  robots: { index: false },
};

/** The order placed, as approved: its number, where the receipt went, what is in it. */
export default function OrderPage({ params }: PageProps<'/orders/[code]'>) {
  return (
    <Suspense fallback={<Band aria-busy="true" />}>
      <Order params={params} />
    </Suspense>
  );
}

async function Order({ params }: Pick<PageProps<'/orders/[code]'>, 'params'>) {
  const { code } = await params;
  return <OrderLive code={code} />;
}
