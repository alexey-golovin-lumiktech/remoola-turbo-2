import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1, `Stripe publishable key is required`),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

let cached: ClientEnv | null = null;

export function getClientEnv(): ClientEnv {
  if (cached !== null) return cached;
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });
  if (!parsed.success) {
    throw new Error(`Invalid client env: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}
