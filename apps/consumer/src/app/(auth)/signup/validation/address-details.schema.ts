import { z } from 'zod';

export const addressDetailsSchema = z.object({
  postalCode: z.string().min(1, `Postal code is required`),
  country: z.string().min(1, `Country is required`),
  state: z.string().optional().nullable(),
  city: z.string().min(1, `City is required`),
  street: z.string().min(1, `Street is required`),
});
