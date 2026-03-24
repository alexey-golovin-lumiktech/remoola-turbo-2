import { isValidPhoneNumber } from 'libphonenumber-js';
import { z } from 'zod';

import { getCountryCode } from '../countries';
import { isValidDateInputFormat, parseDateInput } from '../date-utils';
import { validatePassportOrId } from '../passport-validation';

const isValidDate = (dateString: string): boolean => {
  return isValidDateInputFormat(dateString);
};

const isAtLeast18YearsOld = (dateString: string): boolean => {
  const birthDate = parseDateInput(dateString);
  if (!birthDate) return false;
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
};

const isNotFutureDate = (dateString: string): boolean => {
  const inputDate = parseDateInput(dateString);
  if (!inputDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate <= today;
};

/** Schema for individual (Contractor Individual) personal details. Reused by signup and profile settings. */
export const personalDetailsSchema = z
  .object({
    firstName: z.string().min(1, `First name is required`),
    lastName: z.string().min(1, `Last name is required`),
    dateOfBirth: z
      .string()
      .min(1, `Date of birth is required`)
      .refine(isValidDate, `Please enter a valid date`)
      .refine(isNotFutureDate, `Date of birth cannot be in the future`)
      .refine(isAtLeast18YearsOld, `You must be at least 18 years old`),
    citizenOf: z.string().min(1, `Citizenship is required`),
    phoneNumber: z
      .string()
      .min(1, `Phone number is required`)
      .refine((v) => isValidPhoneNumber(v), `Please enter a valid phone number`),
    taxId: z
      .string()
      .min(1, `Tax ID is required`)
      .refine(
        (v) => /^[A-Za-z0-9\s\-.]+$/.test(v.trim()) && v.replace(/\s/g, ``).replace(/[-.]/g, ``).length >= 4,
        `Please enter a valid Tax ID (at least 4 characters; letters, digits, spaces, hyphens, and periods only)`,
      ),
    countryOfTaxResidence: z.string().min(1, `Country of tax residence is required`),
    legalStatus: z
      .string()
      .nullable()
      .transform((v) => v ?? ``)
      .pipe(z.string().min(1, `Legal Status is required`)),
    passportOrIdNumber: z.string().min(1, `Passport/ID number is required`),
  })
  .superRefine((data, ctx) => {
    // Only validate format when the field has a value and citizenship is known.
    // The field-level .min(1) already handles the empty case.
    if (!data.passportOrIdNumber.trim()) return;
    const countryCode = getCountryCode(data.citizenOf || data.countryOfTaxResidence || ``);
    const result = validatePassportOrId(data.passportOrIdNumber, countryCode);
    if (!result.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.message ?? `Please enter a valid passport/ID number`,
        path: [`passportOrIdNumber`],
      });
    }
  });
