import { tokens } from '@deckle/tokens';
import { css } from 'styled-components';

export type TypeRole = keyof typeof tokens.type;

/** A type role from the scale, whole: family, size, weight, leading and tracking. */
export const typeRole = (role: TypeRole) => {
  const { family, size, weight, leading, tracking } = tokens.type[role];
  return css`
    font-family: ${family};
    font-size: ${size};
    font-weight: ${weight};
    line-height: ${leading};
    letter-spacing: ${tracking};
    /* The edition numbers line up in columns: 07 / 50 never shifts as it counts. */
    font-variant-numeric: ${role === 'numeral' ? 'tabular-nums' : 'normal'};
  `;
};
