import { z } from 'zod';

export const personalSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().min(1),
  citizenOf: z.string().min(1),
  phoneNumber: z.string().min(1),
  taxId: z.string().optional().nullable(),
  countryOfTaxResidence: z.string().min(1),
});
