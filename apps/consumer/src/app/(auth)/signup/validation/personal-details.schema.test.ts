import { getFieldErrors } from './field-errors';
import { personalDetailsSchema } from './personal-details.schema';
import { LEGAL_STATUS } from '../../../../types';

const validBase = {
  firstName: `John`,
  lastName: `Doe`,
  citizenOf: `United States`,
  countryOfTaxResidence: `United States`,
  legalStatus: LEGAL_STATUS.INDIVIDUAL,
  taxId: `123-45-6789`,
  dateOfBirth: `1990-01-15`,
  passportOrIdNumber: `AB1234567`,
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
        legalStatus: LEGAL_STATUS.INDIVIDUAL_ENTREPRENEUR,
      });
      expect(result.success).toBe(true);
    });

    it(`passes with Sole Trader legal status`, () => {
      const result = personalDetailsSchema.safeParse({
        ...validBase,
        legalStatus: LEGAL_STATUS.SOLE_TRADER,
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

    it(`fails when passportOrIdNumber is empty`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, passportOrIdNumber: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).passportOrIdNumber).toBe(`Passport/ID number is required`);
      }
    });

    it(`fails when phoneNumber is empty`, () => {
      const result = personalDetailsSchema.safeParse({ ...validBase, phoneNumber: `` });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(getFieldErrors(result.error).phoneNumber).toBe(`Phone number is required`);
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
});
