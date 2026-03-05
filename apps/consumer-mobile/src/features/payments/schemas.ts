import { z } from 'zod';

/** Balance response: { [currencyCode]: amountCents } */
export const balanceSchema = z.record(z.string(), z.number());

/** Counterparty in payment request */
export const counterpartySchema = z.object({
  id: z.string(),
  email: z.string(),
});

/** Latest transaction info */
export const latestTransactionSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

/** Payment request item (matches backend /consumer/payments response) */
export const paymentItemSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currencyCode: z.string(),
  status: z.string(),
  type: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  createdAt: z.string(),
  counterparty: counterpartySchema,
  latestTransaction: latestTransactionSchema.optional().nullable(),
});

/** Paginated payments response */
export const paymentsResponseSchema = z.object({
  items: z.array(paymentItemSchema),
  total: z.number(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export type Counterparty = z.infer<typeof counterpartySchema>;
export type LatestTransaction = z.infer<typeof latestTransactionSchema>;
export type PaymentItem = z.infer<typeof paymentItemSchema>;
export type PaymentsResponse = z.infer<typeof paymentsResponseSchema>;

export type Balance = z.infer<typeof balanceSchema>;

export const paymentParamsSchema = z.object({
  paymentRequestId: z.string().min(1),
});
