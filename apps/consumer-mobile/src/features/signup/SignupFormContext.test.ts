import { describe, expect, it } from '@jest/globals';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '@remoola/api-types';

import { mergeSignupDetails } from './SignupFormContext';

describe(`consumer-mobile signup form context`, () => {
  it(`clears contractor kind when switching to business`, () => {
    const current = {
      email: `user@example.com`,
      password: `Password1!`,
      confirmPassword: `Password1!`,
      accountType: ACCOUNT_TYPE.CONTRACTOR,
      contractorKind: CONTRACTOR_KIND.ENTITY,
      howDidHearAboutUs: null,
      howDidHearAboutUsOther: null,
    };

    expect(mergeSignupDetails(current, { accountType: ACCOUNT_TYPE.BUSINESS })).toEqual({
      ...current,
      accountType: ACCOUNT_TYPE.BUSINESS,
      contractorKind: null,
    });
  });

  it(`preserves contractor kind for contractor flows`, () => {
    const current = {
      email: `user@example.com`,
      password: `Password1!`,
      confirmPassword: `Password1!`,
      accountType: ACCOUNT_TYPE.CONTRACTOR,
      contractorKind: CONTRACTOR_KIND.INDIVIDUAL,
      howDidHearAboutUs: null,
      howDidHearAboutUsOther: null,
    };

    expect(mergeSignupDetails(current, { email: `updated@example.com` })).toEqual({
      ...current,
      email: `updated@example.com`,
    });
  });
});
