import { describe, expect, it } from '@jest/globals';

import { ACCOUNT_TYPE, CONTRACTOR_KIND, HOW_DID_HEAR_ABOUT_US } from '@remoola/api-types';

import { applyGoogleSignupSession, hasUsableGoogleSignupSession } from './google-session';
import { type SignupFormState } from './types';

const baseState: SignupFormState = {
  signupDetails: {
    email: ``,
    password: ``,
    confirmPassword: ``,
    accountType: ACCOUNT_TYPE.CONTRACTOR,
    contractorKind: CONTRACTOR_KIND.INDIVIDUAL,
    howDidHearAboutUs: null,
    howDidHearAboutUsOther: null,
  },
  individualDetails: {
    firstName: ``,
    lastName: ``,
    citizenOf: ``,
    countryOfTaxResidence: ``,
    legalStatus: null,
    taxId: ``,
    dateOfBirth: ``,
    passportOrIdNumber: ``,
    phoneNumber: ``,
  },
  entityDetails: {
    countryOfTaxResidence: ``,
    taxId: ``,
    phoneNumber: ``,
    legalAddress: ``,
  },
  organizationDetails: {
    name: ``,
    size: null,
    consumerRole: null,
  },
  addressDetails: {
    postalCode: ``,
    country: ``,
    state: ``,
    city: ``,
    street: ``,
  },
  googleSignupToken: `token`,
  googleHydrationLoading: true,
  googleHydrationError: `old error`,
  hydratedGoogleToken: null,
};

describe(`applyGoogleSignupSession`, () => {
  it(`recognizes usable google signup session payloads only when email is present`, () => {
    expect(hasUsableGoogleSignupSession({ email: `hello@example.com` })).toBe(true);
    expect(hasUsableGoogleSignupSession({ email: `   ` })).toBe(false);
    expect(hasUsableGoogleSignupSession({ givenName: `Ada`, familyName: `Lovelace` })).toBe(false);
  });

  it(`hydrates email and names from google session`, () => {
    const next = applyGoogleSignupSession(
      baseState,
      { email: `hello@example.com`, givenName: `Ada`, familyName: `Lovelace` },
      `token`,
    );

    expect(next.signupDetails.email).toBe(`hello@example.com`);
    expect(next.signupDetails.howDidHearAboutUs).toBe(HOW_DID_HEAR_ABOUT_US.GOOGLE);
    expect(next.individualDetails.firstName).toBe(`Ada`);
    expect(next.individualDetails.lastName).toBe(`Lovelace`);
    expect(next.googleHydrationError).toBeNull();
    expect(next.googleHydrationLoading).toBe(false);
    expect(next.hydratedGoogleToken).toBe(`token`);
  });

  it(`does not overwrite already selected or typed values`, () => {
    const next = applyGoogleSignupSession(
      {
        ...baseState,
        signupDetails: {
          ...baseState.signupDetails,
          email: `manual@example.com`,
          howDidHearAboutUs: HOW_DID_HEAR_ABOUT_US.REFERRED_RECOMMENDED,
        },
        individualDetails: {
          ...baseState.individualDetails,
          firstName: `Manual`,
          lastName: `Name`,
        },
      },
      { email: `google@example.com`, givenName: `Ada`, familyName: `Lovelace` },
      `token`,
    );

    expect(next.signupDetails.email).toBe(`manual@example.com`);
    expect(next.signupDetails.howDidHearAboutUs).toBe(HOW_DID_HEAR_ABOUT_US.REFERRED_RECOMMENDED);
    expect(next.individualDetails.firstName).toBe(`Manual`);
    expect(next.individualDetails.lastName).toBe(`Name`);
  });
});
