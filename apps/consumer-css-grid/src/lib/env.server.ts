import 'server-only';

import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url().optional(),
  COOKIE_SECURE: z.string().optional(),
  VERCEL: z.string().optional(),
  VERCEL_AUTOMATION_BYPASS_SECRET: z.string().optional(),
  DEV_LOGIN_EMAIL: z.email().optional(),
  DEV_LOGIN_PASSWORD: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

// intentional: env is process-wide and immutable after startup
let cached: Env | null = null;

export function getEnv(): Env {
  if (cached !== null) return cached;
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    COOKIE_SECURE: process.env.COOKIE_SECURE,
    VERCEL: process.env.VERCEL,
    VERCEL_AUTOMATION_BYPASS_SECRET: process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    DEV_LOGIN_EMAIL: process.env.DEV_LOGIN_EMAIL,
    DEV_LOGIN_PASSWORD: process.env.DEV_LOGIN_PASSWORD,
  });
  if (!parsed.success) {
    throw new Error(`Invalid env: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}
