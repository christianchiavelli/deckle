'use client';

import { tokens as t } from '@deckle/tokens';
import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Button } from '../components/button/button.tsx';
import { Icon } from '../components/icon/icon.tsx';
import { IconButton } from '../components/icon-button/icon-button.tsx';
import { typeRole } from '../theme/type.ts';

const Dialog = styled.dialog`
  inline-size: min(100% - 2 * ${t.space.gapMd}, 28rem);
  padding: ${t.space.gapXl};
  border: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
  border-radius: ${t.radius.frame};
  background: ${t.surface.page};
  color: ${t.text.primary};

  &::backdrop {
    background: color-mix(in oklab, ${t.surface.deep} 70%, transparent);
  }
`;

const Body = styled.div`
  position: relative;
  display: grid;
  gap: ${t.space.gapLg};

  h2 {
    ${typeRole('heading2')}
    text-wrap: balance;
  }
`;

/* Last in the dialog's order, so opening it focuses the way in, and first to the eye. */
const Close = styled.div`
  position: absolute;
  inset-block-start: -0.5rem;
  inset-inline-end: -0.75rem;
`;

const Key = styled.span`
  display: grid;
  place-items: center;
  inline-size: 3rem;
  block-size: 3rem;
  border-radius: 50%;
  background: ${t.accent.subtle};
  color: ${t.icon.accent};
`;

const Text = styled.p`
  color: ${t.text.secondary};
`;

const Actions = styled.div`
  display: grid;
  gap: ${t.space.gapSm};

  button {
    inline-size: 100%;
  }
`;

const Outline = styled(Button)`
  && {
    border: ${t.strokeWidth.hairline} solid ${t.stroke.strong};
    background: none;
    color: ${t.text.primary};
  }

  &&:hover:not(:disabled) {
    background: ${t.surface.sheet};
  }
`;

const Status = styled.p<{ $failed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${t.space.gapXs};
  min-block-size: 1.5rem;
  color: ${({ $failed }) => ($failed ? t.feedback.error : t.text.secondary)};
  font-size: 0.875rem;
  font-weight: ${t.type.label.weight};
`;

const Small = styled.p`
  color: ${t.text.secondary};
  font-size: 0.8125rem;
`;

/** Asking which way in; waiting while the device asks its owner; or saying it did not work. */
export type PasskeyStep = 'ask' | 'waiting' | 'failed';

export interface PasskeyDialogProps {
  id: string;
  open: boolean;
  step: PasskeyStep;
  title: string;
  text: string;
  /** The two ways in: a passkey made here before, or a new one. */
  use: string;
  make: string;
  /** Said while the device's own prompt is up, and when it fails. */
  waiting: string;
  failed: string;
  /** What a passkey keeps, and what it does not. */
  small: string;
  close: string;
  onUse?: () => void;
  onMake?: () => void;
  onClose?: () => void;
}

/**
 * The way in before a drop: a passkey, made once on this device or used again.
 * A modal dialog, the browser's own, so focus is held inside it and Escape
 * closes it; while the device asks its owner, both ways wait.
 */
export function PasskeyDialog({
  id,
  open,
  step,
  title,
  text,
  use,
  make,
  waiting,
  failed,
  small,
  close,
  onUse,
  onMake,
  onClose,
}: PasskeyDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) {
      element?.showModal();
    }
    if (!open && element?.open) {
      element.close();
    }
  }, [open]);

  const busy = step === 'waiting';
  return (
    <Dialog ref={dialog} aria-labelledby={id} onClose={onClose}>
      <Body>
        <Key>
          <Icon name="key" />
        </Key>
        <h2 id={id}>{title}</h2>
        <Text>{text}</Text>
        <Actions>
          <Button variant="accent" icon="key" disabled={busy} onClick={onUse}>
            {use}
          </Button>
          <Outline disabled={busy} onClick={onMake}>
            {make}
          </Outline>
        </Actions>
        <Status role="status" $failed={step === 'failed'}>
          {step === 'failed' && <Icon name="info" size="small" />}
          {step === 'waiting' ? waiting : step === 'failed' ? failed : ''}
        </Status>
        <Small>{small}</Small>
        <Close>
          <IconButton icon="close" label={close} onClick={onClose} />
        </Close>
      </Body>
    </Dialog>
  );
}
