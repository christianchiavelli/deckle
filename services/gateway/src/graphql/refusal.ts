import { GraphQLError } from 'graphql';

/**
 * The reasons the gateway turns a request down that a client can act on. Each
 * travels as `extensions.code`, which is what the store branches on; the error
 * logging plugin leaves them out of the logs, as they are no fault of the server.
 */
export const RefusalCode = {
  /** The operation needs a signed-in account. */
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  /** No passkey ceremony was begun in this browser, or it ran out of time. */
  NO_CEREMONY: 'NO_CEREMONY',
  /** The device's answer did not prove the passkey. */
  PASSKEY_REJECTED: 'PASSKEY_REJECTED',
  /** That size of that work is not for sale. */
  NOT_FOR_SALE: 'NOT_FOR_SALE',
  /** The line is no longer in the cart. */
  NO_SUCH_LINE: 'NO_SUCH_LINE',
  /** Checkout needs something in the cart. */
  CART_EMPTY: 'CART_EMPTY',
  /** Commerce turned the address or the contact down. */
  INVALID_DETAILS: 'INVALID_DETAILS',
  /** The test payment did not go through; nothing was charged. */
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  /** No drop by that name. */
  NO_SUCH_DROP: 'NO_SUCH_DROP',
  /** The drop has not opened yet. */
  DROP_NOT_OPEN: 'DROP_NOT_OPEN',
  /** Every copy is held or sold; a held one may come back. */
  NO_COPY_OPEN: 'NO_COPY_OPEN',
  /** One copy per person, held or paid. */
  ALREADY_HAS_COPY: 'ALREADY_HAS_COPY',
  /** One copy held at a time: pay for it or let it go first. */
  HOLDING_ANOTHER: 'HOLDING_ANOTHER',
  /** No copy is held for this account, or its ten minutes ran out. */
  NO_HOLD: 'NO_HOLD',
  /** A payment for this copy is already under way. */
  PAYMENT_IN_PROGRESS: 'PAYMENT_IN_PROGRESS',
} as const;

export type RefusalCode = keyof typeof RefusalCode;

export function refusal(code: RefusalCode, message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code } });
}
