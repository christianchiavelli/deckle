import { Band } from '@deckle/ui';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getCopy } from '../../../../../copy/server';
import { OrderLive } from '../../../../../live/order-page';

export async function generateMetadata(): Promise<Metadata> {
  const { order } = await getCopy();
  // An order's page is one browser's own: there is nothing for a search engine.
  return { title: order.placed, robots: { index: false } };
}

/** The order placed, as approved: its number, where the receipt went, what is in it. */
export default function OrderPage({ params }: PageProps<'/[lang]/orders/[code]'>) {
  return (
    <Suspense fallback={<Band aria-busy="true" />}>
      <Order params={params} />
    </Suspense>
  );
}

async function Order({ params }: Pick<PageProps<'/[lang]/orders/[code]'>, 'params'>) {
  const { code } = await params;
  return <OrderLive code={code} />;
}
