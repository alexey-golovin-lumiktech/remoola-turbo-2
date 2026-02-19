import { z } from 'zod';

/**
 * Shared environment schema across all apps
 * Automatically validated at runtime.
 */
export const envSchema = z.object({
  VERCEL_URL: z.string().optional(),
  VERCEL: z.string().optional(),
  NODE_ENV: z.union([z.literal(`development`), z.literal(`production`)]).default(`development`),

  NEXT_PUBLIC_API_BASE_URL: z.url().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  DATABASE_URL: z.url().optional(),

  OPENAI_API_KEY: z.string().optional(),

  JWT_EXPIRES_IN: z.string().optional().default(`1d`),
  JWT_REFRESH_TTL: z.string().optional().default(`7d`),
  JWT_ACCESS_TTL: z.string().optional().default(`15m`),
  JWT_SECRET: z.string().optional().default(`JWT_SECRET`),
  JWT_ACCESS_SECRET: z.string().optional().default(`JWT_ACCESS_SECRET`),
  JWT_REFRESH_SECRET: z.string().optional().default(`JWT_REFRESH_SECRET`),

  // Admin seeding credentials
  DEFAULT_ADMIN_EMAIL: z.string().default(`regular.admin@wirebill.com`),
  DEFAULT_ADMIN_PASSWORD: z.string().default(`RegularWirebill@Admin123!`),
  SUPER_ADMIN_EMAIL: z.string().default(`super.admin@wirebill.com`),
  SUPER_ADMIN_PASSWORD: z.string().default(`SuperWirebill@Admin123!`),

  S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_PUBLIC_BASE: z.string().optional(),
  POSTGRES_TIMEZONE: z.string().optional().default(`UTC`),
  POSTGRES_HOST: z.string().optional().default(`127.0.0.1`),
  POSTGRES_PORT: z.coerce.number().optional().default(5433),
  POSTGRES_USER: z.string().optional().default(`wirebill`),
  POSTGRES_PASSWORD: z.string().optional().default(`wirebill`),
  POSTGRES_DB: z.string().optional().default(`wirebill`),
  POSTGRES_SSL: z.string().optional().default(`false`),
  COOKIE_SECURE: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  SECURE_SESSION_SECRET: z.string().optional().default(`SECURE_SESSION_SECRET`),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_CALENDAR_SCOPES: z.string().optional(),

  // Stripe
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_WEBHOOK_SECRET_BILLING: z.string().optional(),

  // Email
  NODEMAILER_SMTP_HOST: z.string().default(`NODEMAILER_SMTP_HOST`),
  NODEMAILER_SMTP_PORT: z.coerce.number().default(587),
  NODEMAILER_SMTP_USER: z.string().default(`NODEMAILER_SMTP_USER`),
  NODEMAILER_SMTP_USER_PASS: z.string().default(`NODEMAILER_SMTP_USER_PASS`),
  NODEMAILER_SMTP_DEFAULT_FROM: z.string().default(`noreply@wirebill.com`),

  // AWS
  AWS_FILE_UPLOAD_MAX_SIZE_BYTES: z.coerce.number().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_BUCKET: z.string().optional(),

  // Admin
  ADMIN_EMAIL: z.string().optional(),

  // External services
  NEST_APP_EXTERNAL_ORIGIN: z.string().optional(),
  CONSUMER_APP_ORIGIN: z.string().optional(),

  // Ngrok
  NGROK_AUTH_TOKEN: z.string().optional(),
  NGROK_DOMAIN: z.string().optional(),

  PORT: z.coerce.number().optional().default(3333),

  // Telemetry
  TURBO_TELEMETRY_DISABLED: z.string().optional(),
  DO_NOT_TRACK: z.string().optional(),

  ENABLE_DEBUG: z.string().optional().default(`ENABLED`),
});

export type Environment = z.infer<typeof envSchema>;
