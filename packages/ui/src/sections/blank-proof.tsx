import { tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { TrimMarks } from './stage.tsx';

const Figure = styled.div`
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 5;
  border-radius: ${t.radius.frame};
  background: ${t.surface.stage};
`;

/* An A-sized sheet with nothing printed on it: the outline a missing print leaves. */
const Sheet = styled.div`
  position: relative;
  inline-size: 52%;
  aspect-ratio: 21 / 29.7;
  background: ${t.surface.page};
  outline: ${t.strokeWidth.hairline} dashed ${t.stroke.default};
  outline-offset: calc(${t.strokeWidth.hairline} * -1);
`;

/* Written in pencil under the sheet, where a numbered copy carries its number. */
const Pencil = styled.span`
  position: absolute;
  inset-block-start: calc(100% + 0.75rem);
  inset-inline-end: 0;
  color: ${t.text.secondary};
  font-size: 0.875rem;
  font-style: italic;
  font-weight: 300;
  letter-spacing: 0.04em;
`;

export interface BlankProofProps {
  /** The pencil mark under the sheet, such as "404". */
  mark: string;
}

/** A proof with nothing on it, its trim marks still in place. Decoration: hidden from screen readers. */
export function BlankProof({ mark }: BlankProofProps) {
  return (
    <Figure aria-hidden="true">
      <Sheet>
        <TrimMarks />
        <Pencil>{mark}</Pencil>
      </Sheet>
    </Figure>
  );
}
