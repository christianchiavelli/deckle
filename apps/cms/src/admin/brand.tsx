import { seal } from '@deckle/brand';

/*
 * Deckle's mark where Payload draws its own (admin.components.graphics), styled
 * in custom.scss.
 */

/**
 * The seal in the accent copper, at the start of the breadcrumbs. Its link is
 * named by the title Payload puts around it.
 */
export function Icon() {
  return (
    <svg className="deckle-seal" viewBox="0 0 24 24" aria-hidden="true">
      <path d={seal} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/**
 * The store's lockup on the sign-in page, with the panel's name beside it:
 * commerce's dashboard wears the same mark.
 */
export function Logo() {
  return (
    <div className="deckle-lockup">
      <Icon />
      <span className="deckle-lockup__name">Deckle</span>
      <span className="deckle-lockup__panel">CMS</span>
    </div>
  );
}
