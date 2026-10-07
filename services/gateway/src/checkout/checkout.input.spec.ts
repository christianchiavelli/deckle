import { describe, expect, it } from 'vitest';
import { checkoutDetails, customerOf, type CheckoutInput } from './checkout.input.js';

const form = {
  email: '  ana@example.com ',
  fullName: 'Ana Maria Souza',
  streetLine1: '1000 Fifth Avenue',
  streetLine2: '  ',
  city: 'New York',
  postalCode: '10028',
  countryCode: 'us',
} satisfies CheckoutInput;

describe('checkoutDetails', () => {
  it('tidies the form into what commerce is sent', () => {
    expect(checkoutDetails(form)).toEqual({
      email: 'ana@example.com',
      address: {
        fullName: 'Ana Maria Souza',
        streetLine1: '1000 Fifth Avenue',
        streetLine2: null,
        city: 'New York',
        postalCode: '10028',
        countryCode: 'US',
      },
    });
    expect(checkoutDetails({ ...form, streetLine2: undefined }).address.streetLine2).toBeNull();
    expect(checkoutDetails({ ...form, streetLine2: 'Floor 2' }).address.streetLine2).toBe(
      'Floor 2',
    );
  });

  it('names each field that fails, once', () => {
    expect(() => checkoutDetails({ ...form, email: '', postalCode: 'x'.repeat(21) })).toThrow(
      expect.objectContaining({
        extensions: { code: 'BAD_USER_INPUT', fields: ['email', 'postalCode'] },
      }),
    );
  });
});

describe('customerOf', () => {
  it('takes the last word as the surname and the rest as given names', () => {
    expect(customerOf(checkoutDetails(form))).toEqual({
      emailAddress: 'ana@example.com',
      firstName: 'Ana Maria',
      lastName: 'Souza',
    });
  });

  it('keeps a single name whole, as a given name', () => {
    expect(customerOf(checkoutDetails({ ...form, fullName: 'Madonna' }))).toMatchObject({
      firstName: 'Madonna',
      lastName: '',
    });
  });
});
