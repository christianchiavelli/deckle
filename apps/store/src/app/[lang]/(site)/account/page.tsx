import { Band } from '@deckle/ui';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { requestTime } from '../../../components/request-time';
import { copy } from '../../../copy';
import { AccountLive } from '../../../live/account-page';

export const metadata: Metadata = { title: copy.account.title, robots: { index: false } };

/** The account, as approved: a passkey to sign in with, then the copies it holds. */
export default function AccountPage() {
  return (
    <Suspense fallback={<Band aria-busy="true" />}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  // Held copies count down from when the page was drawn.
  return <AccountLive now={await requestTime()} />;
}
