import { z } from 'zod';

export const contractSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  lastRequestId: z.string().nullable(),
  lastStatus: z.string().nullable(),
  lastActivity: z.union([z.string(), z.date()]).nullable(),
  docs: z.number(),
});

export const contractsResponseSchema = z.object({
  items: z.array(contractSchema),
  total: z.number(),
});

export type Contract = z.infer<typeof contractSchema>;
export type ContractsResponse = z.infer<typeof contractsResponseSchema>;
