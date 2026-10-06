import { copperFrom, favicon } from '@deckle/brand';
import foundations from '@deckle/tokens/foundations.json';

/** The seal in the accent copper. It reads nothing at request time, so it is prerendered once. */
export function GET(): Response {
  return new Response(favicon(copperFrom(foundations.colours)), {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
}
