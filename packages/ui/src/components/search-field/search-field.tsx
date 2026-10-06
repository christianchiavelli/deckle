import { tokens as t } from '@deckle/tokens';
import { useId } from 'react';
import styled from 'styled-components';
import { Icon } from '../icon/icon.tsx';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.tsx';

const Form = styled.form`
  position: relative;
  inline-size: 100%;

  > svg {
    position: absolute;
    inset-inline-start: 1rem;
    inset-block-start: 50%;
    translate: 0 -50%;
    color: ${t.icon.secondary};
    pointer-events: none;
  }
`;

const Input = styled.input`
  inline-size: 100%;
  block-size: 2.75rem;
  padding-inline: 2.75rem 2.5rem;
  border: ${t.strokeWidth.hairline} solid transparent;
  border-radius: ${t.radius.chip};
  background: ${t.surface.sheet};
  font-size: 0.9375rem;

  &::placeholder {
    color: ${t.text.secondary};
  }

  /* The field is the focus indicator: its border turns copper and it lifts to the page. */
  &:focus {
    border-color: ${t.stroke.accent};
    background: ${t.surface.page};
    outline: none;
  }

  &::-webkit-search-cancel-button {
    display: none;
  }
`;

const Key = styled.kbd`
  position: absolute;
  inset-inline-end: 0.75rem;
  inset-block-start: 50%;
  translate: 0 -50%;
  min-inline-size: 1.5rem;
  padding: 0.0625rem 0.375rem;
  border: ${t.strokeWidth.hairline} solid ${t.stroke.default};
  border-radius: 0.375rem;
  color: ${t.text.secondary};
  font: 500 0.75rem / 1.4 ${t.type.body.family};
  text-align: center;
`;

export interface SearchFieldProps {
  /** Where the form goes: the search page, which works without any script. */
  action: string;
  label: string;
  placeholder: string;
  /** The key that focuses the field from anywhere on the page, shown as a hint. */
  shortcut?: string;
  className?: string;
}

/** Search across prints, artists and techniques: a plain GET form, so it works before scripts load. */
export function SearchField({ action, label, placeholder, shortcut, className }: SearchFieldProps) {
  const id = useId();
  return (
    <Form role="search" action={action} className={className}>
      <VisuallyHidden as="label" htmlFor={id}>
        {label}
      </VisuallyHidden>
      <Icon name="search" size="small" />
      <Input id={id} type="search" name="q" placeholder={placeholder} autoComplete="off" />
      {shortcut && <Key aria-hidden="true">{shortcut}</Key>}
    </Form>
  );
}
