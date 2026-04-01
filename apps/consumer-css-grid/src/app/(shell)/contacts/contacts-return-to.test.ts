import { describe, expect, it } from '@jest/globals';

import { sanitizeContactsReturnTo } from './contacts-return-to';

describe(`contacts returnTo sanitization`, () => {
  it(`keeps the start-payment resume path`, () => {
    expect(sanitizeContactsReturnTo(`/payments/start?resumeStartPayment=1`)).toBe(
      `/payments/start?resumeStartPayment=1`,
    );
  });

  it(`drops unsafe external navigation targets`, () => {
    expect(sanitizeContactsReturnTo(`https://evil.example/steal`)).toBe(``);
    expect(sanitizeContactsReturnTo(`javascript:alert(1)`)).toBe(``);
    expect(sanitizeContactsReturnTo(`//evil.example/path`)).toBe(``);
  });
});
