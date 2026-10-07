import { tokens as t } from '@deckle/tokens';
import type { ComponentPropsWithRef } from 'react';
import styled from 'styled-components';
import { ButtonLink } from '../components/button/button.tsx';
import { Icon } from '../components/icon/icon.tsx';
import { IconButton } from '../components/icon-button/icon-button.tsx';
import { inline } from './band.tsx';

/* Hung from the header, under its cart, so it follows the bar as it sticks: the
   print just added and the two ways on. On a phone it spans the width. */
const Panel = styled.section`
  position: absolute;
  inset-block-start: calc(100% + ${t.space.gapXs});
  inset-inline: 0;
  z-index: 30;
  pointer-events: none;
`;

const Frame = styled.div`
  ${inline}
  display: flex;
  justify-content: flex-end;
`;

const Sheet = styled.div`
  display: grid;
  gap: ${t.space.gapMd};
  inline-size: min(100%, 24rem);
  padding: ${t.space.gapLg};
  border: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
  border-radius: ${t.radius.frame};
  background: ${t.surface.page};
  box-shadow: 0 1.25rem 2.5rem -1.5rem color-mix(in oklab, ${t.text.primary} 45%, transparent);
  pointer-events: auto;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${t.space.gapSm};

  h2 {
    display: flex;
    align-items: center;
    gap: ${t.space.gapXs};
    font-size: 0.9375rem;
    font-weight: ${t.type.label.weight};
  }

  h2 svg {
    color: ${t.feedback.success};
  }
`;

const Print = styled.div`
  display: grid;
  grid-template-columns: 4rem minmax(0, 1fr);
  align-items: center;
  gap: ${t.space.gapMd};
`;

const Mat = styled.span`
  display: block;
  aspect-ratio: 1;
  padding: 0.375rem;
  border-radius: 0.375rem;
  background: ${t.surface.stage};

  img {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: contain;
  }
`;

const Words = styled.div`
  display: grid;
  gap: 0.125rem;
  min-inline-size: 0;

  strong {
    overflow: hidden;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: ${t.text.secondary};
    font-size: 0.875rem;
  }
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${t.space.gapSm};

  a {
    min-block-size: 2.75rem;
    padding-inline: ${t.space.gapMd};
    font-size: 0.9375rem;
  }
`;

const Secondary = styled(ButtonLink)`
  && {
    border: ${t.strokeWidth.hairline} solid ${t.stroke.strong};
    background: none;
    color: ${t.text.primary};
  }

  &&:hover {
    background: ${t.surface.sheet};
  }
`;

export interface AddedToCartProps extends Omit<ComponentPropsWithRef<'section'>, 'title'> {
  id: string;
  title: string;
  print: {
    image: { src: string; width: number; height: number } | null;
    title: string;
    /** "A3, unframed · $90". */
    detail: string;
  };
  /** "2 prints in your cart · $180". */
  summary: string;
  cart: { href: string; label: string };
  checkout: { href: string; label: string };
  close: { label: string; onClick?: () => void };
}

/**
 * What was just added, beside the cart it went into: a sheet that does not
 * take the page over, so the reader can keep looking or go to pay.
 */
export function AddedToCart({
  id,
  title,
  print,
  summary,
  cart,
  checkout,
  close,
  ...rest
}: AddedToCartProps) {
  return (
    <Panel aria-labelledby={id} {...rest}>
      <Frame>
        <Sheet>
          <Head>
            <h2 id={id}>
              <Icon name="check" size="small" />
              {title}
            </h2>
            <IconButton icon="close" label={close.label} onClick={close.onClick} />
          </Head>
          <Print>
            <Mat>
              {print.image && (
                <img
                  src={print.image.src}
                  width={print.image.width}
                  height={print.image.height}
                  alt=""
                />
              )}
            </Mat>
            <Words>
              <strong>{print.title}</strong>
              <span>{print.detail}</span>
              <span>{summary}</span>
            </Words>
          </Print>
          <Actions>
            <Secondary href={cart.href}>{cart.label}</Secondary>
            <ButtonLink href={checkout.href}>{checkout.label}</ButtonLink>
          </Actions>
        </Sheet>
      </Frame>
    </Panel>
  );
}
