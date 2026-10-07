import { tokens as t } from '@deckle/tokens';
import { type ComponentPropsWithRef, type ReactNode, useId } from 'react';
import styled, { css } from 'styled-components';
import { Icon } from '../icon/icon.tsx';

const Wrap = styled.div`
  display: grid;
  align-content: start;
  gap: ${t.space.gap2xs};
  min-inline-size: 0;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: ${t.type.label.weight};
`;

/* A field is paper with a hairline: its border turns copper while it is in use,
   and the error's red when what is in it would be refused. */
const control = css`
  inline-size: 100%;
  min-block-size: 3rem;
  padding-inline: ${t.space.gapMd};
  border: ${t.strokeWidth.hairline} solid ${t.stroke.strong};
  border-radius: ${t.radius.control};
  background: ${t.surface.page};
  color: ${t.text.primary};
  font-size: 1rem;

  &:focus-visible {
    border-color: ${t.stroke.accent};
    outline: ${t.strokeWidth.hairline} solid ${t.stroke.accent};
    outline-offset: 0;
  }

  &[aria-invalid='true'] {
    border-color: ${t.feedback.error};
  }
`;

const Input = styled.input`
  ${control}
`;

const Select = styled.select`
  ${control}
  appearance: none;
  padding-inline-end: 2.75rem;
  background-image: none;
  cursor: pointer;
`;

/* The select's own arrow is drawn by the browser in its own colours; this one is the shop's. */
const Arrow = styled.span`
  position: relative;

  > svg {
    position: absolute;
    inset-inline-end: ${t.space.gapMd};
    inset-block-start: 50%;
    translate: 0 -50%;
    rotate: 90deg;
    color: ${t.icon.secondary};
    pointer-events: none;
  }
`;

const Hint = styled.p`
  color: ${t.text.secondary};
  font-size: 0.8125rem;
`;

const Error = styled.p`
  display: flex;
  align-items: center;
  gap: ${t.space.gap2xs};
  color: ${t.feedback.error};
  font-size: 0.8125rem;
  font-weight: ${t.type.label.weight};
`;

interface FieldText {
  readonly label: string;
  /** Said below the field, and read with it: what goes in, or why it is asked. */
  readonly hint?: string;
  /** Why what is in the field would be refused, set after a try to submit. */
  readonly error?: string;
}

function useDescription(id: string | undefined, { hint, error }: Omit<FieldText, 'label'>) {
  const own = useId();
  const field = id ?? own;
  const hintId = `${field}-hint`;
  const errorId = `${field}-error`;
  return {
    field,
    hintId,
    errorId,
    describedBy: [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined,
  };
}

function Below({
  hint,
  error,
  hintId,
  errorId,
}: Omit<FieldText, 'label'> & { hintId: string; errorId: string }) {
  return (
    <>
      {hint && <Hint id={hintId}>{hint}</Hint>}
      {error && (
        <Error id={errorId}>
          <Icon name="info" size="small" />
          {error}
        </Error>
      )}
    </>
  );
}

export type TextFieldProps = FieldText & Omit<ComponentPropsWithRef<'input'>, 'children'>;

/** A labelled field, with what it is for below it and, once a try fails, why. */
export function TextField({ label, hint, error, id, ...input }: TextFieldProps) {
  const { field, hintId, errorId, describedBy } = useDescription(id, { hint, error });
  return (
    <Wrap>
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...input}
      />
      <Below hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </Wrap>
  );
}

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export type SelectFieldProps = FieldText &
  Omit<ComponentPropsWithRef<'select'>, 'children'> & {
    readonly options: readonly SelectOption[];
    /** The first, empty choice, when nothing is chosen yet. */
    readonly placeholder?: ReactNode;
  };

/** A labelled choice from a list, the browser's own picker under the shop's frame. */
export function SelectField({
  label,
  hint,
  error,
  id,
  options,
  placeholder,
  ...select
}: SelectFieldProps) {
  const { field, hintId, errorId, describedBy } = useDescription(id, { hint, error });
  return (
    <Wrap>
      <Label htmlFor={field}>{label}</Label>
      <Arrow>
        <Select
          id={field}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...select}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Icon name="chevron" size="small" />
      </Arrow>
      <Below hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </Wrap>
  );
}
