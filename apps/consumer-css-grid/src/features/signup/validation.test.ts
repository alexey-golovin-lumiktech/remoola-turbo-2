import { describe, expect, it } from '@jest/globals';

import {
  ACCOUNT_TYPE,
  CONSUMER_ROLE,
  HOW_DID_HEAR_ABOUT_US,
  LEGAL_STATUS,
  ORGANIZATION_SIZE,
} from '@remoola/api-types';

import {
  addressDetailsSchema,
  createSignupDetailsSchema,
  individualDetailsSchema,
  organizationDetailsSchema,
} from './validation';

describe(`signup validation`, () => {
  it(`rejects whitespace-only organization names`, () => {
    const result = organizationDetailsSchema.safeParse({
      name: `   `,
      consumerRole: CONSUMER_ROLE.FOUNDER,
      size: ORGANIZATION_SIZE.SMALL,
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error(`Expected organization name validation to fail`);
    expect(result.error.flatten().fieldErrors.name).toEqual([`Organization name is required`]);
  });

  it(`rejects whitespace-only address street`, () => {
    const result = addressDetailsSchema.safeParse({
      postalCode: `10023`,
      country: `United States`,
      state: `NY`,
      city: `New York`,
      street: `   `,
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error(`Expected address street validation to fail`);
    expect(result.error.flatten().fieldErrors.street).toEqual([`Street is required`]);
  });

  it(`rejects whitespace-only individual first name`, () => {
    const result = individualDetailsSchema.safeParse({
      firstName: `   `,
      lastName: `Doe`,
      dateOfBirth: `1990-10-01`,
      citizenOf: `United States`,
      countryOfTaxResidence: `United States`,
      legalStatus: LEGAL_STATUS.INDIVIDUAL,
      taxId: `123456789`,
      passportOrIdNumber: `A1234567`,
      phoneNumber: `+12125550123`,
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error(`Expected individual first name validation to fail`);
    expect(result.error.flatten().fieldErrors.firstName).toEqual([`First name is required`]);
  });

  it(`rejects whitespace-only password and confirmation`, () => {
    const result = createSignupDetailsSchema(false).safeParse({
      email: `test@example.com`,
      password: `        `,
      confirmPassword: `        `,
      accountType: ACCOUNT_TYPE.BUSINESS,
      contractorKind: null,
      howDidHearAboutUs: HOW_DID_HEAR_ABOUT_US.GOOGLE,
      howDidHearAboutUsOther: null,
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error(`Expected signup password validation to fail`);
    expect(result.error.flatten().fieldErrors.password).toEqual([
      `Password is required`,
      `Password must be at least 8 characters`,
    ]);
    expect(result.error.flatten().fieldErrors.confirmPassword).toEqual([`Please confirm your password`]);
  });
});
