import { refusal } from '../graphql/refusal.js';
import type { RequestSession } from './sessions.service.js';

/** The account signed in on this browser, or the refusal a drop gives a guest. */
export async function signedInAccount(session: RequestSession): Promise<string> {
  const userId = (await session.current())?.userId ?? null;
  if (userId === null) {
    throw refusal('UNAUTHENTICATED', 'A drop is one copy per person: sign in with a passkey first');
  }
  return userId;
}
