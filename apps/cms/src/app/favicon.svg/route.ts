import { copperFrom, favicon } from '@deckle/brand';
import foundations from '@deckle/tokens/foundations.json';

// Written once, at build time: the seal in the accent copper, as the store's tab shows it.
export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(favicon(copperFrom(foundations.colours)), {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
}
