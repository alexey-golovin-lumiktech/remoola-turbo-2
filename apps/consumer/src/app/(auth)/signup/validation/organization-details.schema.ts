import { z } from 'zod';

export const organizationSchema = z.object({
  name: z.string().min(1, `Organization name is required`),
  consumerRole: z.string().min(1, `Role in the organization is required`),
  size: z.string().min(1, `Organization size is required`),
});
