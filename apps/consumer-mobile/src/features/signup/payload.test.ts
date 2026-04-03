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

function createBaseArgs(): Parameters<typeof buildSignupPayload>[0] {
  return {
    signupDetails: {
      email: `mobile@example.com`,
      password: `Password123!`,
      confirmPassword: `Password123!`,
      accountType: ACCOUNT_TYPE.CONTRACTOR,
      contractorKind: CONTRACTOR_KIND.INDIVIDUAL,
      howDidHearAboutUs: HOW_DID_HEAR_ABOUT_US.GOOGLE,
      howDidHearAboutUsOther: null,
    },
    personalDetails: {
      firstName: `Mila`,
      lastName: `Mobile`,
      citizenOf: `United States`,
      countryOfTaxResidence: `United States`,
      legalStatus: LEGAL_STATUS.SOLE_TRADER,
      taxId: `98-7654321`,
      dateOfBirth: `1990-05-01`,
      passportOrIdNumber: `P1234567`,
      phoneNumber: `+14155550102`,
    },
    organizationDetails: {
      name: `Remoola Mobile LLC`,
      size: ORGANIZATION_SIZE.SMALL,
      consumerRole: CONSUMER_ROLE.FOUNDER,
      consumerRoleOther: null,
    },
    addressDetails: {
      postalCode: `10001`,
      country: `United States`,
      state: `NY`,
      city: `New York`,
      street: `123 Main St`,
    },
    googleSignupToken: null,
    isBusiness: false,
    isContractorEntity: false,
  };
}

describe(`consumer-mobile signup payload`, () => {
  it(`sends null legalStatus for business/entity compatibility payloads`, () => {
    const args = createBaseArgs();
    args.signupDetails.accountType = ACCOUNT_TYPE.BUSINESS;
    args.signupDetails.contractorKind = null;
    args.isBusiness = true;

    const payload = buildSignupPayload(args);

    expect(payload.personalDetails).toEqual({
      citizenOf: `United States`,
      dateOfBirth: `1990-05-01`,
      passportOrIdNumber: `98-7654321`,
      countryOfTaxResidence: `United States`,
      taxId: `98-7654321`,
      phoneNumber: `+14155550102`,
      firstName: null,
      lastName: null,
      legalStatus: null,
    });
    expect(payload.organizationDetails).toEqual(args.organizationDetails);
  });

  it(`preserves legalStatus for individual flows`, () => {
    const payload = buildSignupPayload(createBaseArgs());

    expect(payload.personalDetails).toEqual({
      firstName: `Mila`,
      lastName: `Mobile`,
      citizenOf: `United States`,
      countryOfTaxResidence: `United States`,
      legalStatus: LEGAL_STATUS.SOLE_TRADER,
      taxId: `98-7654321`,
      dateOfBirth: `1990-05-01`,
      passportOrIdNumber: `P1234567`,
      phoneNumber: `+14155550102`,
    });
    expect(payload.organizationDetails).toBeNull();
  });
});
