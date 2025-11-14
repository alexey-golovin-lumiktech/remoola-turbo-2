import { z } from 'zod';

export const addressSchema = z.object({
  postalCode: z.string().min(1),
  country: z.string().min(1),
  state: z.string().optional().nullable(),
  city: z.string().min(1),
  street: z.string().min(1),
});
