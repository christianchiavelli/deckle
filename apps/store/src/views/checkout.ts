import { z } from 'zod/mini';
import type { CheckoutInput } from '../live/generated';

/**
 * The checkout form, read and checked in the browser before anything is sent,
 * by the rules the gateway checks it by again: a field it refuses is named in
 * the refusal, and marked the same way.
 */

export const CHECKOUT_FIELDS = [
  'email',
  'fullName',
  'streetLine1',
  'streetLine2',
  'city',
  'postalCode',
  'countryCode',
] as const;

export type CheckoutField = (typeof CHECKOUT_FIELDS)[number];

const line = (max: number) => z.string().check(z.trim(), z.minLength(1), z.maxLength(max));

const formSchema = z.object({
  email: z.pipe(z.string().check(z.trim()), z.email().check(z.maxLength(254))),
  fullName: line(120),
  streetLine1: line(120),
  streetLine2: z.string().check(z.trim(), z.maxLength(120)),
  city: line(80),
  postalCode: line(20),
  countryCode: z.string().check(z.trim(), z.toUpperCase(), z.regex(/^[A-Z]{2}$/)),
});

export type CheckoutRead =
  | { readonly ok: true; readonly input: CheckoutInput }
  | { readonly ok: false; readonly fields: readonly CheckoutField[] };

/** The form's values as the gateway takes them, or every field that would be refused, in order. */
export function readCheckout(values: Readonly<Record<string, unknown>>): CheckoutRead {
  const raw = Object.fromEntries(
    CHECKOUT_FIELDS.map((field) => {
      const value = values[field];
      return [field, typeof value === 'string' ? value : ''];
    }),
  );
  const parsed = formSchema.safeParse(raw);
  if (!parsed.success) {
    const failed = new Set(parsed.error.issues.map((issue) => issue.path[0]));
    return { ok: false, fields: CHECKOUT_FIELDS.filter((field) => failed.has(field)) };
  }
  const { streetLine2, ...rest } = parsed.data;
  return { ok: true, input: { ...rest, streetLine2: streetLine2 === '' ? null : streetLine2 } };
}

/** The fields a refusal names in `extensions.fields`, in the form's order. */
export function refusedFields(
  extensions: Readonly<Record<string, unknown>> | undefined,
): CheckoutField[] {
  const named = extensions?.['fields'];
  return Array.isArray(named) ? CHECKOUT_FIELDS.filter((field) => named.includes(field)) : [];
}
