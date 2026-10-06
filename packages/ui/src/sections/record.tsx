import { media, tokens as t } from '@deckle/tokens';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Missing } from '../components/missing/missing.tsx';

const List = styled.dl`
  display: grid;

  @media ${media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: ${t.space.gap3xl};
  }

  div {
    display: grid;
    grid-template-columns: 7.5rem minmax(0, 1fr);
    gap: ${t.space.gapMd};
    padding-block: 0.875rem;
    border-block-start: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
    font-size: 0.9375rem;

    @media ${media.md} {
      grid-template-columns: 9rem minmax(0, 1fr);
    }
  }

  dt {
    color: ${t.text.secondary};
  }
`;

const Absent = styled.dd`
  color: ${t.text.muted};
`;

export interface RecordEntry {
  readonly term: string;
  /** `null` when the museum's record leaves the field empty. */
  readonly detail: ReactNode;
}

export interface RecordProps {
  entries: readonly RecordEntry[];
  /** What an empty field means, read aloud in place of its dash: "Not recorded". */
  missing: string;
}

/** The museum's own record of the work, field by field, gaps shown as gaps. */
export function Record({ entries, missing }: RecordProps) {
  return (
    <List>
      {entries.map((entry) => (
        <div key={entry.term}>
          <dt>{entry.term}</dt>
          {entry.detail === null ? (
            <Absent>
              <Missing label={missing} />
            </Absent>
          ) : (
            <dd>{entry.detail}</dd>
          )}
        </div>
      ))}
    </List>
  );
}
