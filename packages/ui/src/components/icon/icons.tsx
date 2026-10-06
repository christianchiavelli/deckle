/**
 * Deckle's icons, drawn for the store on a 24-unit grid with a 1.6 stroke and
 * round ends, so they sit with Host Grotesk at text sizes. No icon library: a
 * handful of shapes is cheaper than a dependency, and these are the shop's own.
 */
import { seal } from '../../brand/seal.ts';

export const icons = {
  /** The mark, the studio's seal. Filled, the one icon that is. */
  deckle: <path d={seal} fill="currentColor" fillRule="evenodd" stroke="none" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  theme: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8.5h14l-1 12H6Z" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
    </>
  ),
  arrow: <path d="M5 12h13M13 7l5 5-5 5" />,
  /** Leaves the store: The Met's page for a work, for instance. */
  out: <path d="M8 16 16 8M10 8h6v6" />,
  chevron: <path d="m10 7 5 5-5 5" />,
  zoom: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5M10.5 8v5M8 10.5h5" />
    </>
  ),
  /** A numbered edition is claimed with a passkey. */
  key: (
    <>
      <circle cx="8" cy="12" r="3.5" />
      <path d="M11.5 12H20M17 12v3M20 12v2.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.75" r="0.6" fill="currentColor" />
    </>
  ),
  /** Prints ship rolled. */
  tube: (
    <>
      <ellipse cx="6.5" cy="12" rx="2.5" ry="4" />
      <path d="M6.5 8H18a2.5 4 0 0 1 0 8H6.5" />
    </>
  ),
  /** Pixels per inch: a grid of them. */
  ppi: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16" />
    </>
  ),
  /** Open Access: an open padlock. */
  open: (
    <>
      <rect x="5" y="11" width="14" height="9.5" rx="1.5" />
      <path d="M8.5 11V7.5a3.5 3.5 0 0 1 6.8-1.2" />
    </>
  ),
  check: <path d="m6 12.5 4 4 8-8.5" />,
  /** Two rules, not three: the menu on a phone. */
  menu: <path d="M4 9h16M4 15h16" />,
  close: <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />,
};

export type IconName = keyof typeof icons;

export const iconNames = Object.keys(icons) as IconName[];
