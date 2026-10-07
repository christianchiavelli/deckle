import { media, tokens as t } from '@deckle/tokens';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import styled from 'styled-components';
import { Icon } from '../components/icon/icon.tsx';
import type { IconName } from '../components/icon/icons.tsx';
import { typeRole } from '../theme/type.ts';

/** A checkout's form: its parts one under the other, each a fieldset with its own heading. */
export const CheckoutForm = styled.form`
  display: grid;
  gap: ${t.space.gap2xl};
`;

const Fieldset = styled.fieldset`
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 0;

  legend {
    ${typeRole('heading3')}
    padding: 0;
  }
`;

const Lede = styled.p`
  margin-block-start: ${t.space.gap2xs};
  color: ${t.text.secondary};
  font-size: 0.9375rem;
`;

const Fields = styled.div`
  display: grid;
  gap: ${t.space.gapMd};
  margin-block-start: ${t.space.gapMd};
`;

export interface FormSectionProps {
  title: string;
  /** Why the part is asked for, under its heading. */
  lede?: string;
  children: ReactNode;
}

/** One part of a form, such as the address, under a heading a screen reader reads with each field. */
export function FormSection({ title, lede, children }: FormSectionProps) {
  return (
    <Fieldset>
      <legend>{title}</legend>
      {lede && <Lede>{lede}</Lede>}
      <Fields>{children}</Fields>
    </Fieldset>
  );
}

/** Two fields side by side from a laptop up, such as the city and the postcode. */
export const FieldPair = styled.div`
  display: grid;
  gap: ${t.space.gapMd};

  @media ${media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Card = styled.label`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: ${t.space.gapSm};
  padding: ${t.space.gapMd};
  border: ${t.strokeWidth.hairline} solid ${t.stroke.strong};
  border-radius: ${t.radius.control};
  cursor: pointer;

  &:has(input:checked) {
    border-color: ${t.stroke.accent};
    box-shadow: inset 0 0 0 ${t.strokeWidth.hairline} ${t.stroke.accent};
  }

  input {
    margin: 0.25rem 0 0;
    accent-color: ${t.accent.default};
  }

  strong {
    font-weight: ${t.type.label.weight};
  }

  span {
    display: block;
    color: ${t.text.secondary};
    font-size: 0.875rem;
  }

  b {
    font-variant-numeric: tabular-nums;
    font-weight: ${t.type.label.weight};
  }
`;

export type ChoiceCardProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'title'> & {
  title: string;
  detail?: string;
  /** What choosing it adds, at the row's end. */
  price?: string;
};

/** A radio with room for a sentence: a way to ship, for instance. */
export function ChoiceCard({ title, detail, price, ...input }: ChoiceCardProps) {
  return (
    <Card>
      <input type="radio" {...input} />
      <div>
        <strong>{title}</strong>
        {detail && <span>{detail}</span>}
      </div>
      {price && <b>{price}</b>}
    </Card>
  );
}

const Panel = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: ${t.space.gapSm};
  padding: ${t.space.gapMd};
  border-radius: ${t.radius.control};
  background: ${t.surface.sheet};
  font-size: 0.9375rem;

  svg {
    margin-block-start: 0.125rem;
    color: ${t.icon.accent};
  }

  strong {
    display: block;
    font-weight: ${t.type.label.weight};
  }

  p {
    color: ${t.text.secondary};
  }
`;

export interface PanelNoteProps {
  icon: IconName;
  title: string;
  children: ReactNode;
}

/** Something to know before going on, set apart on the sheet's tint: that a payment is a test, for one. */
export function PanelNote({ icon, title, children }: PanelNoteProps) {
  return (
    <Panel>
      <Icon name={icon} />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </Panel>
  );
}
