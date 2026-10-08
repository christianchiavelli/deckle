import { describe, expect, it } from 'vitest';
import { readCheckout, refusedFields } from './checkout';

const ana = {
  email: ' ana@example.com ',
  fullName: 'Ana Souza',
  streetLine1: '1000 Fifth Avenue',
  streetLine2: '',
  city: 'New York',
  postalCode: '10028',
  countryCode: 'us',
};

describe('readCheckout', () => {
  it('tidies the form into what the gateway takes', () => {
    expect(readCheckout(ana)).toEqual({
      ok: true,
      input: {
        email: 'ana@example.com',
        fullName: 'Ana Souza',
        streetLine1: '1000 Fifth Avenue',
        streetLine2: null,
        city: 'New York',
        postalCode: '10028',
        countryCode: 'US',
      },
    });
    expect(readCheckout({ ...ana, streetLine2: ' Apt 4 ' })).toMatchObject({
      input: { streetLine2: 'Apt 4' },
    });
  });

  it('names every field that would be refused, in the form’s order', () => {
    expect(readCheckout({ ...ana, city: '  ', email: 'ana@example' })).toEqual({
      ok: false,
      fields: ['email', 'city'],
    });
    expect(readCheckout({ ...ana, streetLine2: 'x'.repeat(121), countryCode: 'USA' })).toEqual({
      ok: false,
      fields: ['streetLine2', 'countryCode'],
    });
  });

  it('reads a field that is missing, or not text, as empty', () => {
    expect(readCheckout({ ...ana, fullName: undefined, postalCode: 10028 })).toEqual({
      ok: false,
      fields: ['fullName', 'postalCode'],
    });
  });
});

describe('refusedFields', () => {
  it('reads the fields a refusal names, in the form’s order, and ignores the rest', () => {
    expect(
      refusedFields({ code: 'BAD_USER_INPUT', fields: ['city', 'email', 'nickname'] }),
    ).toEqual(['email', 'city']);
    expect(refusedFields({ code: 'PAYMENT_FAILED' })).toEqual([]);
    expect(refusedFields(undefined)).toEqual([]);
  });
});
