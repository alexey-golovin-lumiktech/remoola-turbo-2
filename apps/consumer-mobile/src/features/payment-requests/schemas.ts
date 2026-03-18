import { z } from 'zod';

import { emailSchema } from '@remoola/api-types';

export const paymentRequestParamsSchema = z.object({
  paymentRequestId: z.string().min(1),
});

export const createPaymentRequestPayloadSchema = z.object({
  email: emailSchema,
  amount: z.string().min(1),
  currencyCode: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

export type CreatePaymentRequestPayload = z.infer<typeof createPaymentRequestPayloadSchema>;

export function parsePaymentRequestParams(params: unknown): { paymentRequestId: string } | { error: string } {
  const parsed = paymentRequestParamsSchema.safeParse(params);
  if (!parsed.success) return { error: `Invalid paymentRequestId` };
  return { paymentRequestId: parsed.data.paymentRequestId };
}
