import { describe, expect, it } from '@jest/globals';

import {
  ACCOUNT_TYPE,
  CONSUMER_ROLE,
  CONTRACTOR_KIND,
  HOW_DID_HEAR_ABOUT_US,
  LEGAL_STATUS,
  ORGANIZATION_SIZE,
} from '@remoola/api-types';

import { buildSignupPayload } from './payload';
import { type SignupFormState } from './types';

function createBaseState(): SignupFormState {
  return {
    signupDetails: {
      email: `test@example.com`,
      password: `Password123!`,
      confirmPassword: `Password123!`,
      accountType: ACCOUNT_TYPE.CONTRACTOR,
      contractorKind: CONTRACTOR_KIND.INDIVIDUAL,
      howDidHearAboutUs: HOW_DID_HEAR_ABOUT_US.GOOGLE,
      howDidHearAboutUsOther: null,
    },
    individualDetails: {
      firstName: `Jane`,
      lastName: `Doe`,
      citizenOf: `United States`,
      countryOfTaxResidence: `United States`,
      legalStatus: LEGAL_STATUS.INDIVIDUAL,
      taxId: `123456789`,
      dateOfBirth: `1990-10-01`,
      passportOrIdNumber: `A1234567`,
      phoneNumber: `+12125550123`,
    },
    entityDetails: {
      countryOfTaxResidence: `United States`,
      taxId: `98-7654321`,
      phoneNumber: `+12125550123`,
      legalAddress: `15 Central Park W Apt 7P, New York, NY 10023`,
    },
    organizationDetails: {
      name: `Remoola LLC`,
      size: ORGANIZATION_SIZE.SMALL,
      consumerRole: CONSUMER_ROLE.FOUNDER,
    },
    addressDetails: {
      postalCode: `10023`,
      country: `United States`,
      state: `NY`,
      city: `New York`,
      street: `15 Central Park W Apt 7P`,
    },
    googleSignupToken: null,
    googleHydrationLoading: false,
    googleHydrationError: null,
    hydratedGoogleToken: null,
  };
}

const entityCompatibilityPersonalDetails = {
  countryOfTaxResidence: `United States`,
  taxId: `98-7654321`,
  phoneNumber: `+12125550123`,
};

describe(`buildSignupPayload`, () => {
  it(`builds individual contractor payload`, () => {
    const payload = buildSignupPayload(createBaseState());

    expect(payload.personalDetails).toEqual({
      firstName: `Jane`,
      lastName: `Doe`,
      citizenOf: `United States`,
      dateOfBirth: `1990-10-01`,
      legalStatus: LEGAL_STATUS.INDIVIDUAL,
      countryOfTaxResidence: `United States`,
      taxId: `123456789`,
      passportOrIdNumber: `A1234567`,
      phoneNumber: `+12125550123`,
    });
    expect(payload.organizationDetails).toBeUndefined();
  });

  it(`builds business payload with entity compatibility personal details`, () => {
    const state = createBaseState();
    state.signupDetails.accountType = ACCOUNT_TYPE.BUSINESS;
    state.signupDetails.contractorKind = null;

    const payload = buildSignupPayload(state);

    expect(payload.organizationDetails).toEqual({
      name: `Remoola LLC`,
      size: ORGANIZATION_SIZE.SMALL,
      consumerRole: CONSUMER_ROLE.FOUNDER,
    });
    expect(payload.personalDetails).toEqual(entityCompatibilityPersonalDetails);
  });

  it(`builds contractor entity payload with organization and compatibility personal details`, () => {
    const state = createBaseState();
    state.signupDetails.contractorKind = CONTRACTOR_KIND.ENTITY;

    const payload = buildSignupPayload(state);

    expect(payload.contractorKind).toBe(CONTRACTOR_KIND.ENTITY);
    expect(payload.organizationDetails).toEqual({
      name: `Remoola LLC`,
      size: ORGANIZATION_SIZE.SMALL,
      consumerRole: CONSUMER_ROLE.FOUNDER,
    });
    expect(payload.personalDetails).toEqual(entityCompatibilityPersonalDetails);
  });

  it(`prefers google token over password for social signup`, () => {
    const state = createBaseState();
    state.signupDetails.accountType = ACCOUNT_TYPE.BUSINESS;
    state.signupDetails.contractorKind = null;
    state.googleSignupToken = `google-token`;

    const payload = buildSignupPayload(state);

    expect(payload.password).toBeUndefined();
    expect(payload.personalDetails).toEqual(entityCompatibilityPersonalDetails);
  });
});
