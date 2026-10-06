import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';

const Table = styled.table`
  inline-size: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;

  @media ${media.md} {
    font-size: 1rem;
  }

  caption {
    margin-block-end: ${t.space.gapMd};
    color: ${t.text.secondary};
    font-size: 0.875rem;
    text-align: start;
  }

  th,
  td {
    padding: ${t.space.gapSm} ${t.space.gapXs};
    border-block-end: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
    text-align: start;
    vertical-align: baseline;

    @media ${media.md} {
      padding-inline: ${t.space.gapSm};
    }
  }

  thead th {
    color: ${t.text.secondary};
    font-size: 0.8125rem;
    font-weight: ${t.type.label.weight};
  }

  tbody th {
    font-weight: ${t.type.label.weight};
  }

  /* The count of works: right-aligned, so the column reads down as figures. */
  th:last-child,
  td:last-child {
    text-align: end;
  }

  tr[data-none] td:last-child {
    color: ${t.text.secondary};
  }
`;

const Sheet = styled.span`
  display: block;
  color: ${t.text.secondary};
  font-size: 0.8125rem;
  font-weight: 400;
`;

export interface SizeRow {
  readonly size: string;
  /** "21 × 29.7 cm" */
  readonly sheet: string;
  /** The image inside the border: "16 × 24.7 cm". */
  readonly area: string;
  /** What the area needs at the minimum: "1,512 × 2,334 px". */
  readonly pixels: string;
  /** How many works in the shop reach this size. */
  readonly works: number;
}

export interface SizeTableProps {
  caption: string;
  headers: {
    readonly size: string;
    readonly area: string;
    readonly pixels: string;
    readonly works: string;
  };
  rows: readonly SizeRow[];
}

/** Every paper size, the area a print fills on it, the pixels that takes, and how many works have them. */
export function SizeTable({ caption, headers, rows }: SizeTableProps) {
  return (
    <Table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{headers.size}</th>
          <th scope="col">{headers.area}</th>
          <th scope="col">{headers.pixels}</th>
          <th scope="col">{headers.works}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.size} data-none={row.works === 0 ? '' : undefined}>
            <th scope="row">
              {row.size}
              <Sheet>{row.sheet}</Sheet>
            </th>
            <td>{row.area}</td>
            <td>{row.pixels}</td>
            <td>{row.works}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
