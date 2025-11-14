import { z } from 'zod';

export const organizationSchema = z.object({
  name: z.string().min(1),
  consumerRole: z.string().min(1),
  size: z.string().min(1),
});
