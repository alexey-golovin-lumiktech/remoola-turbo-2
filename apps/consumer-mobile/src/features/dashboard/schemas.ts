import { z } from 'zod';

export const dashboardSummarySchema = z.object({
  balanceCents: z.number(),
  activeRequests: z.number(),
  lastPaymentAt: z.string().nullable(),
});

export const dashboardDataSchema = z.object({
  summary: dashboardSummarySchema,
  pendingRequests: z.array(
    z.object({
      id: z.string(),
      counterpartyName: z.string(),
      amount: z.number(),
      currencyCode: z.string(),
      status: z.string(),
      lastActivityAt: z.string().nullable(),
    }),
  ),
  activity: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string().optional(),
      createdAt: z.string(),
      kind: z.string(),
    }),
  ),
  tasks: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      completed: z.boolean(),
    }),
  ),
  quickDocs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      createdAt: z.string(),
    }),
  ),
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;
