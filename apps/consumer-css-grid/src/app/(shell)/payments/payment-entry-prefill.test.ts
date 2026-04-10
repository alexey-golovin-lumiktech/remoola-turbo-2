import { describe, expect, it } from '@jest/globals';

import { parsePaymentEntryPrefillEmail } from './payment-entry-prefill';

describe(`payment entry prefill helpers`, () => {
  it(`accepts a valid email and normalizes case and whitespace`, () => {
    expect(parsePaymentEntryPrefillEmail(`  User+Alias@Example.com `)).toBe(`user+alias@example.com`);
  });

  it(`accepts the first string item from search param arrays`, () => {
    expect(parsePaymentEntryPrefillEmail([`Payee@example.com`, `ignored@example.com`])).toBe(`payee@example.com`);
  });

  it(`rejects invalid or missing emails`, () => {
    expect(parsePaymentEntryPrefillEmail(`not-an-email`)).toBe(``);
    expect(parsePaymentEntryPrefillEmail(undefined)).toBe(``);
    expect(parsePaymentEntryPrefillEmail([``, `user@example.com`])).toBe(``);
  });
});
