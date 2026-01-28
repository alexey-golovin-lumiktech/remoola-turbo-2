import { z } from 'zod';

export const personalDetailsSchema = z.object({
  firstName: z.string().min(1, `First name is required`),
  lastName: z.string().min(1, `Last name is required`),
  dateOfBirth: z.string().min(1, `Date of birth is required`),
  citizenOf: z.string().min(1, `Citizenship is required`),
  phoneNumber: z.string().min(1, `Phone number is required`),
  taxId: z.string().optional().nullable(),
  countryOfTaxResidence: z.string().min(1, `Country of tax residence is required`),
});
