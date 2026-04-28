import { isValidPhoneNumber } from 'libphonenumber-js';
import { z } from 'zod';

import {
  ACCOUNT_TYPE,
  CONTRACTOR_KIND,
  HOW_DID_HEAR_ABOUT_US,
  LEGAL_STATUS,
  ORGANIZATION_SIZE,
  CONSUMER_ROLE,
  emailSchema,
} from '@remoola/api-types';

export function getFieldErrors(error: z.ZodError): Record<string, string> {
  const flat = error.flatten();
  const acc: Record<string, string> = {};
  if (flat.fieldErrors && typeof flat.fieldErrors === `object`) {
    for (const [key, value] of Object.entries(flat.fieldErrors)) {
      const message = Array.isArray(value) ? value[0] : value;
      if (typeof message === `string`) acc[key] = message;
    }
  }
  return acc;
}

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());

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

const taxIdRefine = (value: string) =>
  /^[A-Za-z0-9\s\-.]*$/.test(value) && value.replace(/\s/g, ``).replace(/[-.]/g, ``).length >= 4;

const validPhone = (value: string) => {
  try {
    return isValidPhoneNumber(value);
  } catch {
    return false;
  }
};

const requiredTrimmedString = (message: string) => z.string().trim().min(1, message);

export const addressDetailsSchema = z.object({
  postalCode: requiredTrimmedString(`Postal code is required`),
  country: requiredTrimmedString(`Country is required`),
  state: requiredTrimmedString(`State / Region is required`),
  city: requiredTrimmedString(`City is required`),
  street: requiredTrimmedString(`Street is required`),
});

export const entityDetailsSchema = z.object({
  countryOfTaxResidence: requiredTrimmedString(`Country of tax residence is required`),
  taxId: z
    .string()
    .trim()
    .min(1, `Tax ID is required`)
    .refine(taxIdRefine, `Please enter a valid Tax ID (at least 4 characters)`),
  phoneNumber: requiredTrimmedString(`Phone number is required`).refine(
    validPhone,
    `Please enter a valid phone number`,
  ),
  legalAddress: requiredTrimmedString(`Legal address is required`),
});

export const individualDetailsSchema = z.object({
  firstName: requiredTrimmedString(`First name is required`),
  lastName: requiredTrimmedString(`Last name is required`),
  dateOfBirth: z
    .string()
    .trim()
    .min(1, `Date of birth is required`)
    .refine(validDate, `Please enter a valid date (YYYY-MM-DD)`)
    .refine(isNotFutureDate, `Date of birth cannot be in the future`)
    .refine(isAtLeast18YearsOld, `You must be at least 18 years old`),
  citizenOf: requiredTrimmedString(`Citizenship is required`),
  countryOfTaxResidence: requiredTrimmedString(`Country of tax residence is required`),
  legalStatus: z.nativeEnum(LEGAL_STATUS, { error: () => ({ message: `Legal status is required` }) }),
  taxId: z.string().trim().min(1, `Tax ID is required`).refine(taxIdRefine, `Please enter a valid Tax ID`),
  passportOrIdNumber: requiredTrimmedString(`Passport or ID number is required`),
  phoneNumber: requiredTrimmedString(`Phone number is required`).refine(
    validPhone,
    `Please enter a valid phone number`,
  ),
});

export const organizationDetailsSchema = z.object({
  name: requiredTrimmedString(`Organization name is required`),
  consumerRole: z.nativeEnum(CONSUMER_ROLE, { error: () => ({ message: `Role in the organization is required` }) }),
  size: z.nativeEnum(ORGANIZATION_SIZE, { error: () => ({ message: `Organization size is required` }) }),
});

const signupDetailsBaseSchema = z.object({
  email: emailSchema,
  password: z.string(),
  confirmPassword: z.string(),
  accountType: z.nativeEnum(ACCOUNT_TYPE, { error: () => ({ message: `Account type is required` }) }),
  contractorKind: z.nativeEnum(CONTRACTOR_KIND).nullable(),
  howDidHearAboutUs: z.nativeEnum(HOW_DID_HEAR_ABOUT_US).nullable(),
  howDidHearAboutUsOther: z.string().nullable(),
});

export function createSignupDetailsSchema(hasGoogleToken: boolean) {
  const passwordSchema = hasGoogleToken
    ? z.string().optional()
    : z.string().trim().min(1, `Password is required`).min(8, `Password must be at least 8 characters`);
  const confirmSchema = hasGoogleToken
    ? z.string().optional()
    : z.string().trim().min(1, `Please confirm your password`);

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
    })
    .refine(
      (data) =>
        data.howDidHearAboutUs !== HOW_DID_HEAR_ABOUT_US.OTHER ||
        Boolean(data.howDidHearAboutUsOther && data.howDidHearAboutUsOther.trim()),
      {
        message: `Please tell us how you heard about us`,
        path: [`howDidHearAboutUsOther`],
      },
    );
}
