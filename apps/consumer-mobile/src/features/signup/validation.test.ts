import { describe, expect, it } from '@jest/globals';

import { LEGAL_STATUS } from '@remoola/api-types';

import { personalDetailsSchema } from './validation';

const validPersonalDetails = {
  firstName: `Mila`,
  lastName: `Mobile`,
  citizenOf: `United States`,
  countryOfTaxResidence: `United States`,
  legalStatus: LEGAL_STATUS.INDIVIDUAL,
  taxId: `987654321`,
  dateOfBirth: `1990-05-01`,
  passportOrIdNumber: `P1234567`,
  phoneNumber: `+14155550102`,
};

describe(`consumer-mobile signup validation`, () => {
  it(`accepts supported legal status enum values`, () => {
    expect(
      personalDetailsSchema.safeParse({
        ...validPersonalDetails,
        legalStatus: LEGAL_STATUS.INDIVIDUAL_ENTREPRENEUR,
      }).success,
    ).toBe(true);

    expect(
      personalDetailsSchema.safeParse({
        ...validPersonalDetails,
        legalStatus: LEGAL_STATUS.SOLE_TRADER,
      }).success,
    ).toBe(true);
  });

  it(`rejects arbitrary legal status text`, () => {
    const result = personalDetailsSchema.safeParse({
      ...validPersonalDetails,
      legalStatus: `Self-employed`,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.legalStatus).toContain(`Legal status is required`);
    }
  });
});
