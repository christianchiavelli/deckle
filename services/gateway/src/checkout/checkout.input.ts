import { ApolloServerErrorCode } from '@apollo/server/errors';
import { Field, InputType } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { z } from 'zod';
import type { CustomerDetails, ShippingAddress } from '../commerce/shop-session.client.js';

@InputType({ description: 'Who an order is for and where it goes: the checkout form, as typed.' })
export class CheckoutInput {
  @Field(() => String, { description: 'Where the receipt goes, and nothing else.' })
  email!: string;

  @Field(() => String)
  fullName!: string;

  @Field(() => String)
  streetLine1!: string;

  @Field(() => String, { nullable: true })
  streetLine2?: string | null;

  @Field(() => String)
  city!: string;

  @Field(() => String)
  postalCode!: string;

  @Field(() => String, { description: 'ISO 3166-1 alpha-2, one of `countries`.' })
  countryCode!: string;
}

const line = (max: number) => z.string().trim().min(1).max(max);

const checkoutSchema = z.object({
  email: z.string().trim().pipe(z.email().max(254)),
  fullName: line(120),
  streetLine1: line(120),
  streetLine2: z
    .string()
    .trim()
    .max(120)
    .nullish()
    .transform((value) => (value === '' || value === undefined ? null : value)),
  city: line(80),
  postalCode: line(20),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
});

/** The form, checked and tidied: what commerce is sent. */
export interface CheckoutDetails {
  readonly email: string;
  readonly address: ShippingAddress;
}

/**
 * Checks the form field by field. A refusal names every field that failed in
 * `extensions.fields`, so the store can mark each one instead of the whole form.
 */
export function checkoutDetails(input: CheckoutInput): CheckoutDetails {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    throw new GraphQLError(`Check these fields: ${fields.join(', ')}`, {
      extensions: { code: ApolloServerErrorCode.BAD_USER_INPUT, fields },
    });
  }
  const { email, ...address } = parsed.data;
  return { email, address };
}

/**
 * The names commerce wants for a guest: the last word as the surname, the rest
 * as given names. A single name is all given name; the address keeps it whole.
 */
export function customerOf(details: CheckoutDetails): CustomerDetails {
  const words = details.address.fullName.split(/\s+/);
  const lastName = words.length > 1 ? (words.pop() ?? '') : '';
  return { emailAddress: details.email, firstName: words.join(' '), lastName };
}
