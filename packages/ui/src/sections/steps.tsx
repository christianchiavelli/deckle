import { media, tokens as t } from '@deckle/tokens';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { typeRole } from '../theme/type.ts';

const List = styled.ol`
  display: grid;
  gap: ${t.space.gapXl};

  @media ${media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${t.space.gap2xl};
  }
`;

const Step = styled.li`
  display: grid;
  align-content: start;
  gap: ${t.space.gapSm};
  padding-block-start: ${t.space.gapMd};
  border-block-start: ${t.strokeWidth.rule} solid ${t.stroke.strong};

  h3 {
    ${typeRole('heading3')}
  }

  p {
    color: ${t.text.secondary};
  }
`;

/* The step's number in the edition's figures, as a printer numbers a run. */
const Count = styled.span`
  ${typeRole('numeral')}
  color: ${t.text.accent};
`;

export interface StepsProps {
  steps: readonly { readonly title: string; readonly text: ReactNode }[];
}

/** A short process in order, each step under a rule with its number. */
export function Steps({ steps }: StepsProps) {
  return (
    <List>
      {steps.map((step, index) => (
        <Step key={step.title}>
          <Count aria-hidden="true">{String(index + 1).padStart(2, '0')}</Count>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
        </Step>
      ))}
    </List>
  );
}
