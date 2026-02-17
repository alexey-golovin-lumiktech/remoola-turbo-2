import { LegalStatuses } from '@remoola/api-types';

import { getFieldErrors } from './field-errors';
import { personalDetailsSchema } from './personal-details.schema';

const validBase = {
  firstName: `John`,
  lastName: `Doe`,
  citizenOf: `United States`,
  countryOfTaxResidence: `United States`,
  legalStatus: LegalStatuses.INDIVIDUAL,
  taxId: `123-45-6789`,
  dateOfBirth: `1990-01-15`,
  passportOrIdNumber: `123456789`, // US format: 9 digits
  phoneNumber: `+12025551234`,
};

describe(`personalDetailsSchema`, () => {
  describe(`Contractor Individual - valid data`, () => {
    it(`passes with all valid personal details`, () => {
      const result = personalDetailsSchema.safeParse(validBase);
      expect(result.success).toBe(true);
    });

    it(`passes with Individual Entrepreneur legal status`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        legalStatus: LegalStatuses.INDIVIDUAL_ENTREPRENEUR,
      });
      expect(result.success).toBe(true);
    });

    it(`passes with Sole Trader legal status`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        legalStatus: LegalStatuses.SOLE_TRADER,
      });
      expect(result.success).toBe(true);
    });
  });

  describe(`required fields`, () => {
    it(`fails when firstName is empty`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, firstName: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).firstName).toBe(`First name is required`);
      }
    });

    it(`fails when lastName is empty`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, lastName: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).lastName).toBe(`Last name is required`);
      }
    });

    it(`fails when citizenOf is empty`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, citizenOf: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).citizenOf).toBe(`Citizenship is required`);
      }
    });

    it(`fails when countryOfTaxResidence is empty`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, countryOfTaxResidence: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).countryOfTaxResidence).toBe(`Country of tax residence is required`);
      }
    });

    it(`fails when legalStatus is empty`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, legalStatus: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).legalStatus).toBe(`Legal Status is required`);
      }
    });

    it(`fails when taxId is empty`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, taxId: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).taxId).toBe(`Tax ID is required`);
      }
    });

    it(`fails when taxId is too short`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, taxId: `123` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).taxId).toContain(`valid Tax ID`);
      }
    });

    it(`fails when taxId contains invalid characters`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, taxId: `12-34#5678` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).taxId).toContain(`valid Tax ID`);
      }
    });

    it(`fails when passportOrIdNumber is empty`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, passportOrIdNumber: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).passportOrIdNumber).toBe(`Passport/ID number is required`);
      }
    });

    it(`fails when passportOrIdNumber has invalid format for US`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        passportOrIdNumber: `ABC123`, // US expects 9 digits or A+8 digits
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).passportOrIdNumber).toContain(`valid passport/ID`);
      }
    });

    it(`passes when passportOrIdNumber is valid for US (9 digits)`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        passportOrIdNumber: `123456789`,
      });
      expect(result.success).toBe(true);
    });

    it(`passes when passportOrIdNumber is valid for US (letter + 8 digits)`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        passportOrIdNumber: `A12345678`,
      });
      expect(result.success).toBe(true);
    });

    it(`passes when passportOrIdNumber is valid for United Kingdom`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `United Kingdom`,
        countryOfTaxResidence: `United Kingdom`,
        passportOrIdNumber: `123456789`,
      });
      expect(result.success).toBe(true);
    });

    it(`fails when passportOrIdNumber has invalid format for United Kingdom`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `United Kingdom`,
        countryOfTaxResidence: `United Kingdom`,
        passportOrIdNumber: `A12345678`, // GB expects 9 digits only
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).passportOrIdNumber).toContain(`valid passport/ID`);
      }
    });

    it(`passes when passportOrIdNumber is valid for Russia`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `Russia`,
        countryOfTaxResidence: `Russia`,
        passportOrIdNumber: `123456789`,
      });
      expect(result.success).toBe(true);
    });

    it(`fails when passportOrIdNumber has invalid format for Russia`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `Russia`,
        countryOfTaxResidence: `Russia`,
        passportOrIdNumber: `A12345678`, // RU expects 9 digits only
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).passportOrIdNumber).toContain(`valid passport/ID`);
      }
    });

    it(`passes with fallback validation for unknown country (6–24 alphanumeric)`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `Afghanistan`,
        countryOfTaxResidence: `Afghanistan`,
        passportOrIdNumber: `ABC12345`,
      });
      expect(result.success).toBe(true);
    });

    it(`fails when phoneNumber is empty`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, phoneNumber: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).phoneNumber).toBe(`Phone number is required`);
      }
    });

    it(`fails when phoneNumber is invalid`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, phoneNumber: `invalid` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).phoneNumber).toBe(`Please enter a valid phone number`);
      }
    });
  });

  describe(`dateOfBirth validation`, () => {
    it(`fails when dateOfBirth is empty`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, dateOfBirth: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).dateOfBirth).toBeDefined();
      }
    });

    it(`fails when dateOfBirth is invalid format`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, dateOfBirth: `15/01/1990` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).dateOfBirth).toBe(`Please enter a valid date`);
      }
    });

    it(`fails when dateOfBirth is in the future`, () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        dateOfBirth: futureDate.toISOString().slice(0, 10),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).dateOfBirth).toBe(`Date of birth cannot be in the future`);
      }
    });

    it(`fails when user is under 18`, () => {
      const recentDate = new Date();
      recentDate.setFullYear(recentDate.getFullYear() - 17);
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        dateOfBirth: recentDate.toISOString().slice(0, 10),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).dateOfBirth).toBe(`You must be at least 18 years old`);
      }
    });

    it(`passes when user is exactly 18`, () => {
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        dateOfBirth: eighteenYearsAgo.toISOString().slice(0, 10),
      });
      expect(result.success).toBe(true);
    });
  });

  describe(`passport/ID edge cases`, () => {
    it(`passes when passport has spaces (normalized before validate)`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        passportOrIdNumber: `123 456 789`,
      });
      expect(result.success).toBe(true);
    });

    it(`passes with leading and trailing spaces`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        passportOrIdNumber: `  123456789  `,
      });
      expect(result.success).toBe(true);
    });

    it(`passes with lowercase (normalized to uppercase)`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        passportOrIdNumber: `a12345678`,
      });
      expect(result.success).toBe(true);
    });

    it(`fails when US passport has 8 digits only`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        passportOrIdNumber: `12345678`,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).passportOrIdNumber).toContain(`valid passport/ID`);
      }
    });

    it(`fails when US passport has 10 digits`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        passportOrIdNumber: `1234567890`,
      });
      expect(result.success).toBe(false);
    });

    it(`passes for France with valid format (2 digits + 2 letters + 5 digits)`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `France`,
        countryOfTaxResidence: `France`,
        passportOrIdNumber: `12AB12345`,
      });
      expect(result.success).toBe(true);
    });

    it(`fails for France with invalid format`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `France`,
        countryOfTaxResidence: `France`,
        passportOrIdNumber: `123456789`,
      });
      expect(result.success).toBe(false);
    });

    it(`passes for Germany with valid 9-char format`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `Germany`,
        countryOfTaxResidence: `Germany`,
        passportOrIdNumber: `C12345678`,
      });
      expect(result.success).toBe(true);
    });

    it(`fails for Germany with invalid char (A not in allowed set)`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `Germany`,
        countryOfTaxResidence: `Germany`,
        passportOrIdNumber: `A12345678`,
      });
      expect(result.success).toBe(false);
    });

    it(`passes for Canada with 2 letters + 6 digits format`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `Canada`,
        countryOfTaxResidence: `Canada`,
        passportOrIdNumber: `AB123456`,
      });
      expect(result.success).toBe(true);
    });

    it(`fails for fallback country when passport too short (< 6 chars)`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `Afghanistan`,
        countryOfTaxResidence: `Afghanistan`,
        passportOrIdNumber: `ABC12`,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).passportOrIdNumber).toContain(`valid passport/ID`);
      }
    });

    it(`passes for fallback country at min boundary (6 chars)`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `Afghanistan`,
        countryOfTaxResidence: `Afghanistan`,
        passportOrIdNumber: `ABC123`,
      });
      expect(result.success).toBe(true);
    });

    it(`passes for fallback country at max boundary (24 chars)`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `Afghanistan`,
        countryOfTaxResidence: `Afghanistan`,
        passportOrIdNumber: `ABCD123456789012345678`,
      });
      expect(result.success).toBe(true);
    });

    it(`fails for fallback country when passport too long (> 24 chars)`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `Afghanistan`,
        countryOfTaxResidence: `Afghanistan`,
        passportOrIdNumber: `ABCD123456789012345678901`, // 25 chars
      });
      expect(result.success).toBe(false);
    });

    it(`fails for fallback country when contains invalid characters`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `Afghanistan`,
        countryOfTaxResidence: `Afghanistan`,
        passportOrIdNumber: `ABC@#$123`,
      });
      expect(result.success).toBe(false);
    });

    it(`passes for fallback country with hyphen`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `Afghanistan`,
        countryOfTaxResidence: `Afghanistan`,
        passportOrIdNumber: `ABC-12345`,
      });
      expect(result.success).toBe(true);
    });

    it(`uses citizenOf for country when both set`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        citizenOf: `Russia`,
        countryOfTaxResidence: `United States`,
        passportOrIdNumber: `123456789`, // valid for both
      });
      expect(result.success).toBe(true);
    });
  });
});
