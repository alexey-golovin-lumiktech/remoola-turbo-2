import { isValidPhoneNumber } from 'libphonenumber-js';
import { z } from 'zod';

/** Schema for entity (Business / Contractor Entity) - company/entity details */
export const entityDetailsSchema = z.object({
  companyName: z.string().min(1, `Company name is required`),
  countryOfTaxResidence: z.string().min(1, `Country of tax residence is required`),
  taxId: z.string().min(1, `Tax ID is required`),
  phoneNumber: z
    .string()
    .min(1, `Phone number is required`)
    .refine((v) => isValidPhoneNumber(v), `Please enter a valid phone number`),
  legalAddress: z.string().min(1, `Legal address is required`),
});
