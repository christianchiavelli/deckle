import { seal } from '@deckle/brand';

/**
 * The store's lockup, the seal and the name set as an imprint, with the panel's
 * name beside it: the editors also sign in to the CMS, which wears the same mark.
 * The negative margin takes back the tracking after the last letter, so the
 * name centres on its letters.
 */
export function SignInMark() {
  return (
    <div className="text-foreground flex items-center gap-2.5">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="text-brand size-8">
        <path d={seal} fill="currentColor" fillRule="evenodd" />
      </svg>
      <span className="-me-[0.22em] text-lg leading-none font-semibold tracking-[0.22em] uppercase">
        Deckle
      </span>
      <span className="text-muted-foreground text-sm leading-none">Commerce</span>
    </div>
  );
}
