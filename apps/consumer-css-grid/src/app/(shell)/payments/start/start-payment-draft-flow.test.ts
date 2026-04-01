import { describe, expect, it } from '@jest/globals';

import {
  buildUnknownRecipientContactsUrl,
  parseResumeStartPaymentFlag,
  parseStoredStartPaymentDraft,
  START_PAYMENT_DRAFT_STORAGE_KEY,
  START_PAYMENT_RESUME_PATH,
} from './start-payment-draft-flow';
import { sanitizeContactsReturnTo } from '../../contacts/contacts-return-to';

describe(`start payment draft flow helpers`, () => {
  it(`keeps the shared session storage key stable`, () => {
    expect(START_PAYMENT_DRAFT_STORAGE_KEY).toBe(`consumer-css-grid:start-payment-draft`);
  });

  it(`parses a stored draft and fills safe defaults`, () => {
    expect(
      parseStoredStartPaymentDraft(
        JSON.stringify({ email: `User@example.com`, amount: `25`, description: `Note` }),
        `EUR`,
      ),
    ).toEqual({
      email: `User@example.com`,
      amount: `25`,
      currencyCode: `EUR`,
      description: `Note`,
      method: `CREDIT_CARD`,
    });
  });

  it(`returns null for invalid stored draft payloads`, () => {
    expect(parseStoredStartPaymentDraft(`not-json`, `USD`)).toBeNull();
  });

  it(`builds a contacts return url that safely resumes start payment`, () => {
    const url = new URL(buildUnknownRecipientContactsUrl(`new.user+alias@example.com`), `https://remoola.test`);

    expect(url.pathname).toBe(`/contacts`);
    expect(url.searchParams.get(`create`)).toBe(`1`);
    expect(url.searchParams.get(`email`)).toBe(`new.user+alias@example.com`);
    expect(url.searchParams.get(`returnTo`)).toBe(START_PAYMENT_RESUME_PATH);
    expect(sanitizeContactsReturnTo(url.searchParams.get(`returnTo`) ?? ``)).toBe(START_PAYMENT_RESUME_PATH);
  });

  it(`parses the resume flag from search params`, () => {
    expect(parseResumeStartPaymentFlag(`1`)).toBe(true);
    expect(parseResumeStartPaymentFlag([`1`, `0`])).toBe(true);
    expect(parseResumeStartPaymentFlag(`0`)).toBe(false);
    expect(parseResumeStartPaymentFlag(undefined)).toBe(false);
  });
});
