import { describe, expect, it } from '@jest/globals';

import {
  digitsOnly,
  getMethodKind,
  getMethodLabel,
  getMethodMeta,
  isCardExpired,
  isValidEmail,
  normalizeEmail,
  normalizeMonth,
  normalizePhone,
  phoneDigitsCount,
} from './banking-helpers';

describe(`banking helpers`, () => {
  it(`normalizes digits, month, email, and phone inputs for banking forms`, () => {
    expect(digitsOnly(`ab12-34`, 3)).toBe(`123`);
    expect(normalizeMonth(`0`)).toBe(`01`);
    expect(normalizeMonth(`13`)).toBe(`12`);
    expect(normalizeEmail(`  User@Example.COM`)).toBe(`user@example.com`);
    expect(normalizePhone(` +1 (415) 555-2671 ext 99 `)).toBe(`+1415555267199`);
    expect(normalizePhone(`abc`)).toBe(``);
  });

  it(`validates optional billing email and minimum phone digit count consistently`, () => {
    expect(isValidEmail(`person@example.com`)).toBe(true);
    expect(isValidEmail(`not-an-email`)).toBe(false);
    expect(phoneDigitsCount(`+1 (415) 555-2671`)).toBe(11);
    expect(phoneDigitsCount(`12-34`)).toBe(4);
  });

  it(`detects expired cards relative to the provided current date`, () => {
    const currentDate = new Date(`2026-04-17T10:00:00Z`);

    expect(isCardExpired(`03`, `2026`, currentDate)).toBe(true);
    expect(isCardExpired(`04`, `2026`, currentDate)).toBe(false);
    expect(isCardExpired(`05`, `2026`, currentDate)).toBe(false);
    expect(isCardExpired(`13`, `2026`, currentDate)).toBe(false);
  });

  it(`returns consistent labels, metadata, and kind text for banking methods`, () => {
    expect(getMethodLabel({ type: `BANK_ACCOUNT`, brand: `` })).toBe(`Bank account`);
    expect(getMethodMeta({ type: `CREDIT_CARD`, last4: `4242`, expMonth: `08`, expYear: `2030` })).toBe(
      `**** 4242 • Expires 08/30`,
    );
    expect(
      getMethodKind({
        type: `CREDIT_CARD`,
        reusableForPayerPayments: true,
      }),
    ).toMatchObject({
      label: `Reusable payer card`,
    });
    expect(
      getMethodKind({
        type: `CREDIT_CARD`,
        reusableForPayerPayments: false,
      }),
    ).toMatchObject({
      label: `Manual card record`,
    });
  });
});
