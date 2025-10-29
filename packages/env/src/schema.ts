import { z } from 'zod';

/**
 * Shared environment schema across all apps
 * Automatically validated at runtime.
 */
export const envSchema = z.object({
  NODE_ENV: z.union([z.literal(`development`), z.literal(`production`)]).default(`development`),

  // Common URLs
  NEXT_PUBLIC_API_BASE_URL: z.url().optional(),
  DATABASE_URL: z.url().optional(),
  REDIS_URL: z.url().optional(),

  // Optional keys for external APIs
  OPENAI_API_KEY: z.string().optional(),

  // Feature toggles
  ENABLE_DEBUG: z
    .string()
    .optional()
    .transform((v) => v === `true`),

  JWT_EXPIRES_IN: z.string().optional().default(`1d`),
  JWT_REFRESH_TTL: z.string().optional().default(`7d`),
  JWT_ACCESS_TTL: z.string().optional().default(`15m`),
  JWT_SECRET: z.string().optional().default(`JWT_SECRET`),
  JWT_REFRESH_SECRET: z.string().optional().default(`JWT_REFRESH_SECRET`),
  FORCE_PAYMENT_RESULT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_PUBLIC_BASE: z.string().optional(),
  COOKIE_DOMAIN: z.string().optional(),
  POSTGRES_TIMEZONE: z.string().optional().default(`UTC`),
  POSTGRES_HOST: z.string().optional().default(`127.0.0.1`),
  POSTGRES_PORT: z.coerce.number().optional().default(5432),
  POSTGRES_USER: z.string().optional().default(`remoola`),
  POSTGRES_PASSWORD: z.string().optional().default(`remoola`),
  POSTGRES_DB: z.string().optional().default(`remoola`),
  POSTGRES_SSL: z.string().optional().default(`false`),
  COOKIE_SECURE: z.string().optional(),
  SECURE_SESSION_SECRET: z.string().optional().default(`SECURE_SESSION_SECRET`),
  PORT: z.coerce.number().optional().default(3000),
});

export type Environment = z.infer<typeof envSchema>;
