import { z } from 'zod';

const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/) !== null;
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

const isNotFutureDate = (dateString: string): boolean => {
  const inputDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate <= today;
};

/** Schema for individual (Contractor Individual) - personal details */
export const personalDetailsSchema = z.object({
  firstName: z.string().min(1, `First name is required`),
  lastName: z.string().min(1, `Last name is required`),
  dateOfBirth: z
    .string()
    .min(1, `Date of birth is required`)
    .refine(isValidDate, `Please enter a valid date`)
    .refine(isNotFutureDate, `Date of birth cannot be in the future`)
    .refine(isAtLeast18YearsOld, `You must be at least 18 years old`),
  citizenOf: z.string().min(1, `Citizenship is required`),
  phoneNumber: z.string().min(1, `Phone number is required`),
  taxId: z.string().min(1, `Tax ID is required`),
  countryOfTaxResidence: z.string().min(1, `Country of tax residence is required`),
  legalStatus: z.string().min(1, `Legal Status is required`),
  passportOrIdNumber: z.string().min(1, `Passport/ID number is required`),
});
