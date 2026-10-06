import { tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { Icon } from '../icon/icon.tsx';

const List = styled.ol`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${t.space.gapXs};
  color: ${t.text.secondary};
  font-size: 0.8125rem;

  li {
    display: inline-flex;
    align-items: center;
    gap: ${t.space.gapXs};
  }

  a {
    text-decoration: none;
  }

  a:hover {
    color: ${t.text.primary};
  }
`;

export interface Crumb {
  readonly label: string;
  readonly href: string;
}

export interface BreadcrumbsProps {
  /** The landmark's name, "Breadcrumb" in English. */
  label: string;
  items: readonly Crumb[];
}

/** Where a page sits in the shop: from the prints down to the artist. */
export function Breadcrumbs({ label, items }: BreadcrumbsProps) {
  return (
    <nav aria-label={label}>
      <List>
        {items.map((item, index) => (
          <li key={item.href}>
            {index > 0 && <Icon name="chevron" size="tiny" />}
            <a href={item.href}>{item.label}</a>
          </li>
        ))}
      </List>
    </nav>
  );
}
