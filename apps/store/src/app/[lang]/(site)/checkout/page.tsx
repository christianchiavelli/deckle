import { Band } from '@deckle/ui';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { requestTime } from '../../../../components/request-time';
import { getCopy } from '../../../../copy/server';
import { readCountries } from '../../../../gateway/reads';
import { CheckoutLive } from '../../../../live/checkout-page';
import { countryNameOf } from '../../../../views/orders';

export async function generateMetadata(): Promise<Metadata> {
  const { checkout } = await getCopy();
  return { title: checkout.title, robots: { index: false } };
}

/**
 * The checkout, as approved, for the cart or for a drop's held copy
 * (`?drop=<slug>`). Where the shop ships is read here; the cart and the copy
 * are this browser's, read in the browser.
 */
export default function CheckoutPage({ searchParams }: PageProps<'/[lang]/checkout'>) {
  return (
    <Suspense fallback={<Band aria-busy="true" />}>
      <Checkout searchParams={searchParams} />
    </Suspense>
  );
}

async function Checkout({ searchParams }: Pick<PageProps<'/[lang]/checkout'>, 'searchParams'>) {
  const { drop } = await searchParams;
  const now = await requestTime();
  const [{ countries }, { locale }] = await Promise.all([readCountries(), getCopy()]);
  const named = countries
    .map((country) => ({ ...country, name: countryNameOf(country.code, locale) ?? country.name }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return (
    <CheckoutLive
      countries={named}
      drop={typeof drop === 'string' && drop !== '' ? drop : null}
      now={now}
    />
  );
}
