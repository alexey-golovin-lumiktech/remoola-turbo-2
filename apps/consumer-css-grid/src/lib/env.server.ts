/** Server-only: import only from route handlers, server actions, or middleware. */
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached !== null) return cached;
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });
  if (!parsed.success) {
    throw new Error(`Invalid env: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}
