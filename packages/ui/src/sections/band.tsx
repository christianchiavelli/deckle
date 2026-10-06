import { media, tokens as t } from '@deckle/tokens';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { typeRole } from '../theme/type.ts';

/**
 * The page is a stack of full-width bands, each with its own surface: `page`
 * and `band` alternate, `feature` is the copper-dark band of a drop, `deep`
 * the footer's ink.
 */
export type BandTone = 'page' | 'band' | 'feature' | 'deep';

const tones = {
  page: css`
    background: ${t.surface.page};
  `,
  band: css`
    background: ${t.surface.band};
  `,
  feature: css`
    background: ${t.surface.feature};
    color: ${t.text.onFeature};
  `,
  deep: css`
    background: ${t.surface.deep};
    color: ${t.text.onDeep};
  `,
};

/** Room at the sides: the gutter on a phone, and on a wide screen whatever centres the content. */
export const inline = css`
  padding-inline: max(${t.space.gapLg}, (100% - ${t.layout.maxWidth}) / 2);
`;

const Section = styled.section<{ $tone: BandTone; $tight: boolean }>`
  ${inline}
  padding-block: ${t.space.sectionTight};
  ${({ $tone }) => tones[$tone]}

  @media ${media.md} {
    padding-block: ${({ $tight }) => ($tight ? t.space.sectionTight : t.space.section)};
  }
`;

export type BandProps = ComponentPropsWithRef<'section'> & {
  tone?: BandTone;
  /** Less room above and below, for a band that follows a related one. */
  tight?: boolean;
};

/** One full-width band of a page. Name it with `aria-labelledby` pointing at its heading. */
export function Band({ tone = 'page', tight = false, ...rest }: BandProps) {
  return <Section $tone={tone} $tight={tight} {...rest} />;
}

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: ${t.space.gapSm} ${t.space.gapLg};
  margin-block-end: ${t.space.gapXl};

  h2 {
    ${typeRole('heading2')}
    text-wrap: balance;
  }
`;

export interface SectionHeadProps {
  id: string;
  title: ReactNode;
  /** A link beside the title: to every print, to The Met's own record. */
  action?: ReactNode;
}

/** A band's title, with a link to more beside it. */
export function SectionHead({ id, title, action }: SectionHeadProps) {
  return (
    <Head>
      <h2 id={id}>{title}</h2>
      {action}
    </Head>
  );
}
