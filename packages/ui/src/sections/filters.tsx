import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { VisuallyHidden } from '../components/visually-hidden/visually-hidden.tsx';

/* As wide as the page allows, never as wide as its rows: a row scrolls instead. */
const Nav = styled.nav`
  inline-size: 100%;
  min-inline-size: 0;
`;

const Groups = styled.div`
  display: grid;
  gap: ${t.space.gapMd};
`;

const Group = styled.div`
  display: grid;
  gap: ${t.space.gapXs};
  min-inline-size: 0;

  @media ${media.md} {
    grid-template-columns: 6.5rem minmax(0, 1fr);
    align-items: center;
  }
`;

const Label = styled.span`
  color: ${t.text.secondary};
  font-size: 0.8125rem;
  font-weight: ${t.type.label.weight};
`;

/* On a phone a row scrolls sideways instead of wrapping four deep; the cut-off
   pill at the edge says there is more. Room above and below for the focus ring.
   Positioned, so the counts' hidden words scroll with the row, not past the page. */
const Options = styled.ul`
  position: relative;
  display: flex;
  gap: ${t.space.gapXs};
  padding-block: 0.25rem;
  overflow-x: auto;
  scrollbar-width: none;

  @media ${media.md} {
    flex-wrap: wrap;
    overflow-x: visible;
  }
`;

const Count = styled.span`
  color: ${t.text.secondary};
  font-weight: 400;
  font-variant-numeric: tabular-nums;
`;

const Option = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-block-size: 2.25rem;
  padding-inline: 0.875rem;
  border-radius: ${t.radius.chip};
  background: ${t.surface.sheet};
  font-size: 0.875rem;
  font-weight: ${t.type.label.weight};
  text-decoration: none;
  white-space: nowrap;
  transition: background-color ${t.motion.feedback} ${t.motion.easing};

  &:hover {
    box-shadow: inset 0 0 0 ${t.strokeWidth.hairline} ${t.stroke.default};
  }

  /* The choice in force is inked, like the one action a page leads to. */
  &[aria-current='true'] {
    background: ${t.action.primary};
    color: ${t.text.onAction};

    &:hover {
      background: ${t.action.primaryHover};
    }

    ${Count} {
      color: inherit;
    }
  }
`;

export interface FilterOption {
  readonly label: string;
  /** The page with this choice made, and the other groups' choices kept. */
  readonly href: string;
  /** How many prints the choice leaves; none on "All". */
  readonly count?: number;
  readonly current?: boolean;
}

export interface FilterGroup {
  readonly label: string;
  readonly options: readonly FilterOption[];
}

export interface FiltersProps {
  /** Prefixes the groups' label ids, unique on the page. */
  id: string;
  /** The landmark's name, such as "Filter the prints". */
  label: string;
  groups: readonly FilterGroup[];
  /** Read after each count, such as "prints". */
  unit: string;
}

/**
 * Ways to narrow a list, each a row of links: a plain GET, so a choice is an
 * address to share and works before any script loads.
 */
export function Filters({ id, label, groups, unit }: FiltersProps) {
  return (
    <Nav aria-label={label}>
      <Groups>
        {groups.map((group, index) => {
          const labelId = `${id}-${String(index)}`;
          return (
            <Group key={group.label}>
              <Label id={labelId}>{group.label}</Label>
              <Options aria-labelledby={labelId}>
                {group.options.map((option) => (
                  <li key={option.href}>
                    <Option href={option.href} aria-current={option.current ? 'true' : undefined}>
                      {option.label}
                      {/* A space for the accessible name, "Etchings 8 prints"; the gap lays it out. */}
                      {option.count !== undefined && ' '}
                      {option.count !== undefined && (
                        <Count>
                          {option.count}
                          <VisuallyHidden> {unit}</VisuallyHidden>
                        </Count>
                      )}
                    </Option>
                  </li>
                ))}
              </Options>
            </Group>
          );
        })}
      </Groups>
    </Nav>
  );
}
