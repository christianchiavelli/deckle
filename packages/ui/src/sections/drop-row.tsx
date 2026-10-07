import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { ButtonLink } from '../components/button/button.tsx';
import { Chip, type ChipTone } from '../components/chip/chip.tsx';
import { typeRole } from '../theme/type.ts';
import { Band } from './band.tsx';
import { EditionFacts } from './edition.tsx';

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${t.space.gapXl};

  @media ${media.md} {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    gap: ${t.space.gap3xl};
    align-items: center;
  }
`;

const Copy = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapLg};

  h2 {
    ${typeRole('heading2')}
    text-wrap: balance;
  }

  > p {
    max-inline-size: 48ch;
  }
`;

/* The print on its mat. A block, not a grid: the picture fits the mat's box
   instead of stretching it to the scan's own width. */
const Mat = styled.a`
  display: block;
  aspect-ratio: 5 / 4;
  padding: 8%;
  border-radius: ${t.radius.frame};
  background: ${t.surface.stage};

  img {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: contain;
  }
`;

export interface DropRowProps {
  /** The heading's id, for the band's name. */
  id: string;
  /** The open drop on the copper dark, the others on the page. */
  tone: 'feature' | 'page';
  href: string;
  image: { src: string; width: number; height: number };
  /** "Open now", "Opens Thu 22 Oct" or "Closed". */
  state: { label: string; tone: ChipTone };
  title: string;
  text: string;
  facts: readonly { readonly term: string; readonly detail: string }[];
  /** "See the drop", or for the open one "Claim a copy". */
  action: string;
}

/** One drop as a band of its own: where it stands, what it prints, and the way to it. */
export function DropRow({
  id,
  tone,
  href,
  image,
  state,
  title,
  text,
  facts,
  action,
}: DropRowProps) {
  return (
    <Band tone={tone} aria-labelledby={id}>
      <Row>
        <Copy>
          <Chip tone={state.tone}>{state.label}</Chip>
          <h2 id={id}>{title}</h2>
          <p>{text}</p>
          <EditionFacts items={facts} />
          <ButtonLink href={href} variant="accent" icon="arrow">
            {action}
          </ButtonLink>
        </Copy>
        {/* The button leads to the same page; the picture repeats it for the pointer. */}
        <Mat href={href} tabIndex={-1} aria-hidden="true">
          <img src={image.src} width={image.width} height={image.height} alt="" loading="lazy" />
        </Mat>
      </Row>
    </Band>
  );
}
