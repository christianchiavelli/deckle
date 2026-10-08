'use client';

import { tokens as t } from '@deckle/tokens';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import styled from 'styled-components';
import { Icon } from '../icon/icon.tsx';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.tsx';
import { markStarts } from './marks.ts';

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
  /* Where the bar leaves the field narrow, its hint ends in an ellipsis rather than halfway through a word. */
  text-overflow: ellipsis;

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

/* A sheet laid on the page under the field, as wide as it, with a soft shadow below. */
const Panel = styled.div`
  position: absolute;
  inset-block-start: calc(100% + ${t.space.gapXs});
  inset-inline: 0;
  z-index: 20;
  max-block-size: min(70dvh, 34rem);
  padding-block: ${t.space.gapXs};
  overflow-y: auto;
  border: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
  border-radius: ${t.radius.frame};
  background: ${t.surface.page};
  box-shadow: 0 1.25rem 2.5rem -1.5rem color-mix(in oklab, ${t.text.primary} 45%, transparent);
`;

const List = styled.ul`
  display: grid;
`;

const GroupLabel = styled.li`
  padding: ${t.space.gapSm} ${t.space.gapMd} 0.25rem;
  color: ${t.text.secondary};
  font-size: 0.8125rem;
  font-weight: ${t.type.label.weight};
`;

/* The option the arrow keys reach is the one a click would choose: one highlight,
   on the sheet's tint, with a copper rule at its edge like the menu's current page. */
const Option = styled.a<{ $pictured?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $pictured }) => ($pictured ? 'auto minmax(0, 1fr) auto' : 'minmax(0, 1fr) auto')};
  align-items: center;
  gap: ${t.space.gapSm};
  min-block-size: 2.75rem;
  padding: 0.375rem ${t.space.gapMd};
  color: ${t.text.primary};
  text-decoration: none;

  &[aria-selected='true'] {
    background: ${t.surface.sheet};
    box-shadow: inset ${t.strokeWidth.rule} 0 0 ${t.accent.default};
  }
`;

/* The picture fills the mat's square and is fitted inside it, a tall print as
   surely as a wide one: a picture sized by its own height would spill out. */
const Mat = styled.span`
  display: block;
  inline-size: 2.75rem;
  block-size: 2.75rem;
  padding: 0.25rem;
  border-radius: 0.375rem;
  background: ${t.surface.stage};

  img {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: contain;
  }
`;

const Words = styled.span`
  display: grid;
  min-inline-size: 0;
`;

/* Regular, so the typed part, in the brand face's next step up, stands out. */
const Label = styled.span`
  overflow: hidden;
  font-size: 0.9375rem;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;

  mark {
    background: none;
    color: inherit;
    font-weight: 600;
  }
`;

const Detail = styled.span`
  overflow: hidden;
  color: ${t.text.secondary};
  font-size: 0.8125rem;
  text-overflow: ellipsis;
  white-space: nowrap;

  mark {
    background: none;
    color: ${t.text.primary};
  }
`;

const Count = styled.span`
  color: ${t.text.secondary};
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
`;

// Doubled to outrank the option's own columns and colour, whichever arrives last.
const All = styled(Option)`
  && {
    grid-template-columns: minmax(0, 1fr) auto;
    margin-block-start: ${t.space.gapXs};
    border-block-start: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
    color: ${t.text.accent};
    font-size: 0.875rem;
    font-weight: ${t.type.label.weight};
  }
`;

const None = styled.p`
  padding: ${t.space.gapSm} ${t.space.gapMd};
  color: ${t.text.secondary};
  font-size: 0.875rem;
`;

export interface SearchSuggestion {
  /** Where choosing it goes: a print's page, or the prints of a maker or a technique. */
  readonly href: string;
  readonly label: string;
  /** A second line, such as a print's maker and date. */
  readonly detail?: string;
  /** Set at the end of the row, such as how many prints a maker has. */
  readonly count?: string;
  /** A print's picture, small, on a mat. */
  readonly image?: { readonly src: string; readonly width: number; readonly height: number };
}

export interface SearchSuggestionGroup {
  readonly label: string;
  readonly suggestions: readonly SearchSuggestion[];
}

export interface SearchSuggestions {
  readonly groups: readonly SearchSuggestionGroup[];
  /** The last row: every result, on the search page. */
  readonly all: { readonly href: string; readonly label: string } | null;
  /** Said in place of the groups when nothing matches. */
  readonly none: string;
  /** What a screen reader hears when the list changes, such as "4 prints and 1 artist". */
  readonly status: string;
}

/** The suggestions for what has been typed so far. The field waits for a pause, and drops an answer that comes too late. */
export type SuggestionSource = (query: string, signal: AbortSignal) => Promise<SearchSuggestions>;

export interface SearchFieldProps {
  /** Where the form goes: the search page, which works without any script. */
  action: string;
  label: string;
  placeholder: string;
  /** The key that focuses the field from anywhere on the page, shown as a hint. */
  shortcut?: string;
  /** What was searched for, on the page that shows its results. */
  defaultValue?: string;
  /** Names the landmark, where the page has a second search beside the header's. */
  landmark?: string;
  /** Suggests as one types, once scripts run. Without it, or before them, the field is a plain form. */
  suggest?: {
    readonly source: SuggestionSource;
    /** Names the list of suggestions. */
    readonly label: string;
  };
  className?: string;
}

/** The fewest characters worth suggesting for: one letter would match half the shop. */
const SHORTEST_QUERY = 2;
/** The pause in typing a request waits for, so a burst of keys asks once. */
const PAUSE_MS = 120;

/**
 * Search across prints, artists and techniques: a plain GET form, so it works
 * before scripts load. With a source of suggestions it becomes a combobox, as
 * the ARIA practices draw one: focus stays in the field, the arrow keys move
 * through the list, Enter opens the one reached or else searches, and Escape
 * closes the list, then clears the field.
 */
export function SearchField({
  action,
  label,
  placeholder,
  shortcut,
  defaultValue,
  landmark,
  suggest,
  className,
}: SearchFieldProps) {
  const id = useId();
  const listId = `${id}-list`;
  const field = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue ?? '');
  const [answer, setAnswer] = useState<{ query: string; suggestions: SearchSuggestions } | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = value.trim();
  const source = suggest?.source;

  useEffect(() => {
    if (!shortcut) {
      return;
    }
    const focus = (event: globalThis.KeyboardEvent) => {
      const input = field.current;
      if (
        event.key !== shortcut ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        // A key typed into a field is that field's.
        (event.target instanceof Element &&
          event.target.closest('input, textarea, select, [contenteditable]')) ||
        // On a phone the header's field is folded away, with nothing to focus.
        !input?.checkVisibility()
      ) {
        return;
      }
      event.preventDefault();
      input.focus();
      input.select();
    };
    document.addEventListener('keydown', focus);
    return () => {
      document.removeEventListener('keydown', focus);
    };
  }, [shortcut]);

  // Asks only while the field is in use, and only once for each search: a page
  // that opens with a search in its field asks nothing until someone types.
  const asked = answer?.query;
  useEffect(() => {
    if (!source || !open || query.length < SHORTEST_QUERY || asked === query) {
      return;
    }
    const request = new AbortController();
    const timer = setTimeout(() => {
      source(query, request.signal).then(
        (suggestions) => {
          setAnswer({ query, suggestions });
          setActive(-1);
        },
        // A request dropped for a newer one, or one that failed: the list keeps
        // what it showed, and the form still searches.
        () => undefined,
      );
    }, PAUSE_MS);
    return () => {
      clearTimeout(timer);
      request.abort();
    };
  }, [source, open, query, asked]);

  const shown =
    open && answer !== null && query.length >= SHORTEST_QUERY ? answer.suggestions : null;
  const options = shown
    ? [...shown.groups.flatMap((group) => group.suggestions), ...(shown.all ? [shown.all] : [])]
    : [];
  const expanded = options.length > 0;
  const optionId = (index: number) => `${listId}-${String(index)}`;

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!suggest) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!expanded) {
          setOpen(true);
          return;
        }
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        // The field itself is a stop between the last option and the first.
        const stops = options.length + 1;
        setActive((current) => ((current + 1 + step + stops) % stops) - 1);
        return;
      }
      case 'Enter': {
        if (expanded && active >= 0) {
          event.preventDefault();
          document.getElementById(optionId(active))?.click();
        }
        return;
      }
      case 'Escape': {
        if (shown) {
          event.preventDefault();
          setOpen(false);
          setActive(-1);
        } else {
          setValue('');
        }
        return;
      }
    }
  };

  // What was typed, marked where it opens a word: why each suggestion is there.
  const marked = (text: string) =>
    markStarts(text, query).map((run, part) =>
      run.marked ? <mark key={part}>{run.text}</mark> : run.text,
    );

  const option = (suggestion: SearchSuggestion, at: number) => (
    <li key={suggestion.href} role="none">
      <Option
        id={optionId(at)}
        href={suggestion.href}
        role="option"
        aria-selected={at === active}
        tabIndex={-1}
        $pictured={Boolean(suggestion.image)}
        onPointerMove={() => {
          setActive(at);
        }}
      >
        {suggestion.image && (
          <Mat>
            <img
              src={suggestion.image.src}
              width={suggestion.image.width}
              height={suggestion.image.height}
              alt=""
            />
          </Mat>
        )}
        <Words>
          <Label>{marked(suggestion.label)}</Label>
          {/* Spaces for the option's name, "Albrecht Dürer 4 prints"; the grid lays the parts out. */}
          {suggestion.detail && ' '}
          {suggestion.detail && <Detail>{marked(suggestion.detail)}</Detail>}
        </Words>
        {suggestion.count && ' '}
        {suggestion.count && <Count>{suggestion.count}</Count>}
      </Option>
    </li>
  );

  return (
    <Form
      role="search"
      action={action}
      aria-label={landmark}
      className={className}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <VisuallyHidden as="label" htmlFor={id}>
        {label}
      </VisuallyHidden>
      <Icon name="search" size="small" />
      <Input
        ref={field}
        id={id}
        type="search"
        name="q"
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        role={suggest ? 'combobox' : undefined}
        aria-autocomplete={suggest ? 'list' : undefined}
        aria-expanded={suggest ? expanded : undefined}
        aria-controls={suggest ? listId : undefined}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
      />
      {shortcut && <Key aria-hidden="true">{shortcut}</Key>}
      {suggest && (
        <>
          <Panel
            hidden={!shown}
            // Pressing on the list keeps focus in the field, so the click that follows lands.
            onMouseDown={(event) => {
              event.preventDefault();
            }}
          >
            <List id={listId} role="listbox" aria-label={suggest.label}>
              {shown?.groups.map((group, position) => {
                const groupId = `${listId}-group-${String(position)}`;
                const first = shown.groups
                  .slice(0, position)
                  .reduce((count, before) => count + before.suggestions.length, 0);
                return (
                  <li key={group.label} role="none">
                    <List role="group" aria-labelledby={groupId}>
                      <GroupLabel id={groupId} role="presentation">
                        {group.label}
                      </GroupLabel>
                      {group.suggestions.map((suggestion, at) => option(suggestion, first + at))}
                    </List>
                  </li>
                );
              })}
              {shown?.all && (
                <li role="none">
                  <All
                    id={optionId(options.length - 1)}
                    href={shown.all.href}
                    role="option"
                    aria-selected={options.length - 1 === active}
                    tabIndex={-1}
                    onPointerMove={() => {
                      setActive(options.length - 1);
                    }}
                  >
                    {shown.all.label}
                    <Icon name="arrow" size="small" />
                  </All>
                </li>
              )}
            </List>
            {shown && !expanded && <None>{shown.none}</None>}
          </Panel>
          <VisuallyHidden role="status">{shown ? shown.status : ''}</VisuallyHidden>
        </>
      )}
    </Form>
  );
}
