import { tokens as t } from '@deckle/tokens';
import type { MouseEventHandler, ReactNode } from 'react';
import styled from 'styled-components';
import { Icon } from '../components/icon/icon.tsx';

const RULE = '0.25rem';

/* An intaglio plate presses its edge into the paper around the print. A copper
   rule around the window says the whole page is a proof, at any scroll. */
const Plate = styled.div`
  position: fixed;
  inset: 0;
  z-index: 30;
  border: ${RULE} solid ${t.accent.default};
  pointer-events: none;

  @media print {
    display: none;
  }
`;

/* Sticky, not fixed: at the bottom of the window while the page scrolls, and
   under the footer at the end, so it never hides the page's last line. */
const Tab = styled.aside`
  position: sticky;
  inset-block-end: 0;
  z-index: 31;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${t.space.gap2xs} ${t.space.gapSm};
  inline-size: fit-content;
  max-inline-size: calc(100% - 2 * ${t.space.gapMd});
  margin-inline-start: ${t.space.gapMd};
  /* The rule again at the bottom, where the plate's edge covers the tab. */
  padding: ${t.space.gapXs} ${t.space.gapMd} calc(${t.space.gapXs} + ${RULE});
  border-start-start-radius: ${t.radius.control};
  border-start-end-radius: ${t.radius.control};
  background: ${t.accent.default};
  color: ${t.text.onAccent};
  font-size: 0.875rem;

  > strong {
    font-style: italic;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  > a {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: ${t.type.label.weight};
    text-decoration: underline;
    white-space: nowrap;
  }

  /* The focus ring is copper too, and would vanish on the tab. */
  > a:focus-visible {
    outline-color: currentColor;
  }

  @media print {
    display: none;
  }
`;

export interface TrialProofProps {
  /** The mode's name, from the press: "Trial proof". */
  label: string;
  /** What the page shows instead of what is published. */
  children: ReactNode;
  /** Leaving preview: the same page, as published. */
  href: string;
  link: string;
  /** As the reader follows the link, before the browser leaves: the last chance to change where to. */
  onLeave?: MouseEventHandler<HTMLAnchorElement>;
}

/**
 * What a page wears while it shows the CMS's drafts: a proof pulled before the
 * edition. Rendered last on the page, so the frame covers everything above it
 * and the tab is the last stop of the keyboard.
 */
export function TrialProof({ label, children, href, link, onLeave }: TrialProofProps) {
  return (
    <>
      <Plate aria-hidden="true" />
      <Tab aria-label={label}>
        <strong>{label}</strong>
        <span>{children}</span>
        <a href={href} onClick={onLeave}>
          {link}
          <Icon name="arrow" size="small" />
        </a>
      </Tab>
    </>
  );
}
