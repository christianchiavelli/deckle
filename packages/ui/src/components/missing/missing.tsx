import { MISSING } from '../../format.ts';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.tsx';

/**
 * A value the source does not have: a dash on screen, and words for a screen
 * reader, which would otherwise read the dash as punctuation or skip it.
 */
export function Missing({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden="true">{MISSING}</span>
      <VisuallyHidden>{label}</VisuallyHidden>
    </>
  );
}
