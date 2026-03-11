import { isValidPhoneNumber } from 'libphonenumber-js';
import { z } from 'zod';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '@remoola/api-types';

/** Flatten zod errors to field -> message map. */
export function getFieldErrors(error: z.ZodError): Record<string, string> {
  const flat = error.flatten();
  const acc: Record<string, string> = {};
  if (flat.fieldErrors && typeof flat.fieldErrors === `object`) {
    for (const [key, val] of Object.entries(flat.fieldErrors)) {
      const msg = Array.isArray(val) ? val[0] : val;
      if (typeof msg === `string`) acc[key] = msg;
    }
  }
  return acc;
}

const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());

const isNotFutureDate = (dateString: string): boolean => {
  const inputDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate <= today;
};

const isAtLeast18YearsOld = (dateString: string): boolean => {
  const birthDate = new Date(dateString);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
};

const taxIdRefine = (v: string) =>
  /^[A-Za-z0-9\s\-.]*$/.test(v) && v.replace(/\s/g, ``).replace(/[-.]/g, ``).length >= 4;

const validPhone = (v: string) => {
  try {
    return isValidPhoneNumber(v);
  } catch {
    return false;
  }
};

export const addressDetailsSchema = z.object({
  postalCode: z.string().min(1, `Postal code is required`),
  country: z.string().min(1, `Country is required`),
  state: z.string().min(1, `State / Region is required`),
  city: z.string().min(1, `City is required`),
  street: z.string().min(1, `Street is required`),
});

export const entityDetailsSchema = z.object({
  companyName: z.string().min(1, `Company name is required`),
  countryOfTaxResidence: z.string().min(1, `Country of tax residence is required`),
  taxId: z
    .string()
    .min(1, `Tax ID is required`)
    .refine(taxIdRefine, `Please enter a valid Tax ID (at least 4 characters)`),
  phoneNumber: z.string().min(1, `Phone number is required`).refine(validPhone, `Please enter a valid phone number`),
  legalAddress: z.string().min(1, `Legal address is required`),
});

export const personalDetailsSchema = z.object({
  firstName: z.string().min(1, `First name is required`),
  lastName: z.string().min(1, `Last name is required`),
  dateOfBirth: z
    .string()
    .min(1, `Date of birth is required`)
    .refine(validDate, `Please enter a valid date (YYYY-MM-DD)`)
    .refine(isNotFutureDate, `Date of birth cannot be in the future`)
    .refine(isAtLeast18YearsOld, `You must be at least 18 years old`),
  citizenOf: z.string().min(1, `Citizenship is required`),
  countryOfTaxResidence: z.string().min(1, `Country of tax residence is required`),
  legalStatus: z.string().min(1, `Legal status is required`),
  taxId: z.string().min(1, `Tax ID is required`).refine(taxIdRefine, `Please enter a valid Tax ID`),
  passportOrIdNumber: z.string().min(1, `Passport/ID number is required`),
  phoneNumber: z.string().min(1, `Phone number is required`).refine(validPhone, `Please enter a valid phone number`),
});

export const organizationSchema = z.object({
  name: z.string().min(1, `Organization name is required`),
  consumerRole: z.string().min(1, `Role in the organization is required`),
  size: z.string().min(1, `Organization size is required`),
});

const signupDetailsBaseSchema = z.object({
  email: z.string().min(1, `Email is required`).email(`Enter a valid email address`),
  password: z.string(),
  confirmPassword: z.string(),
  accountType: z.enum([ACCOUNT_TYPE.BUSINESS, ACCOUNT_TYPE.CONTRACTOR]),
  contractorKind: z.enum([CONTRACTOR_KIND.ENTITY, CONTRACTOR_KIND.INDIVIDUAL]).nullable(),
});

/** When hasGoogleToken, password/confirmPassword are optional. */
export function createSignupDetailsSchema(hasGoogleToken: boolean) {
  const passwordSchema = hasGoogleToken
    ? z.string().optional()
    : z.string().min(1, `Password is required`).min(8, `Password must be at least 8 characters`);
  const confirmSchema = hasGoogleToken ? z.string().optional() : z.string().min(1, `Please confirm your password`);
  return signupDetailsBaseSchema
    .extend({ password: passwordSchema, confirmPassword: confirmSchema })
    .refine(
      (data) =>
        data.accountType === ACCOUNT_TYPE.CONTRACTOR ? data.contractorKind !== null : data.contractorKind === null,
      { message: `Choose a contractor kind`, path: [`contractorKind`] },
    )
    .refine((data) => hasGoogleToken || data.password === data.confirmPassword, {
      message: `Passwords do not match`,
      path: [`confirmPassword`],
    });
}
