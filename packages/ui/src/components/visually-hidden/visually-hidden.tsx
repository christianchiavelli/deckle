import styled, { css } from 'styled-components';

/** Out of sight but still read aloud and still focusable, unlike `display: none`. */
export const visuallyHidden = css`
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;

/** Words for screen readers only, such as what a dash in place of a value means. */
export const VisuallyHidden = styled.span`
  ${visuallyHidden}
`;
