import { z } from 'zod';

export const paymentMethodParamsSchema = z.object({
  paymentMethodId: z.string().min(1),
});

export function parsePaymentMethodParams(params: unknown): { paymentMethodId: string } | { error: string } {
  const parsed = paymentMethodParamsSchema.safeParse(params);
  if (!parsed.success) return { error: `Invalid paymentMethodId` };
  return { paymentMethodId: parsed.data.paymentMethodId };
}
