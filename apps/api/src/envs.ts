import z, { type ZodArray, type ZodDefault, type ZodType, type ZodTypeAny } from 'zod';

export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || `JWT_ACCESS_SECRET`;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `JWT_REFRESH_SECRET`;

/**
 * Parse expiry string (e.g. '15m', '168h', '1d', '60s') to milliseconds.
 * Used for cookie maxAge and any ms-based TTL. Fintech-safe defaults: short access (15m), limited refresh (7d).
 */
export function parseExpiresToMs(value: string): number {
  const s = String(value).trim();
  const match = /^(\d+)(s|m|h|d)$/i.exec(s);
  if (!match) {
    const fallback = 15 * 60 * 1000;
    return fallback;
  }
  const n = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === `s`) return n * 1000;
  if (unit === `m`) return n * 60 * 1000;
  if (unit === `h`) return n * 60 * 60 * 1000;
  if (unit === `d`) return n * 24 * 60 * 60 * 1000;
  return 15 * 60 * 1000;
}

/** 24 hours in ms (e.g. for password-reset link validity). */
export const HOURS_24MS = 86400000 as const;

const ENVIRONMENT = { PRODUCTION: `production`, STAGING: `staging`, DEVELOPMENT: `development`, TEST: `test` } as const;
const environments = Object.values(ENVIRONMENT);

const node = {
  NODE_ENV: z
    .union([
      z.literal(ENVIRONMENT.PRODUCTION),
      z.literal(ENVIRONMENT.STAGING),
      z.literal(ENVIRONMENT.DEVELOPMENT),
      z.literal(ENVIRONMENT.TEST),
    ])
    .default(ENVIRONMENT.PRODUCTION),
};

export function zBoolean(fallback = false): ZodType<boolean> {
  return z.preprocess((raw) => {
    if (typeof raw === `string`) {
      const lowered = raw.trim().toLowerCase();
      if ([`true`, `1`, `yes`, `y`].includes(lowered)) return true;
      if ([`false`, `0`, `no`, `n`].includes(lowered)) return false;
    }
    return typeof raw === `boolean` ? raw : fallback;
  }, z.boolean());
}

function zArray<T extends ZodTypeAny>(itemSchema: T, fallback: z.infer<T>[] = []): ZodDefault<ZodArray<T>> {
  const arrWithDefault = z.array(itemSchema).default(fallback);
  return z.preprocess((raw) => {
    if (typeof raw === `string`) {
      try {
        return JSON.parse(raw);
      } catch {
        return raw
          .split(`,`)
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return raw;
  }, arrWithDefault) as unknown as ZodDefault<ZodArray<T>>;
}

const database = {
  DATABASE_URL: z.string().optional(),
};

const nest = {
  PORT: z.coerce.number().optional().default(3000),
  NEST_APP_HOST: z.string().default(`127.0.0.1`),
  NEST_APP_EXTERNAL_ORIGIN: z.string().default(`NEST_APP_EXTERNAL_ORIGIN`),
  CONSUMER_APP_ORIGIN: z.string().default(`CONSUMER_APP_ORIGIN`),
  ADMIN_APP_ORIGIN: z.string().default(`ADMIN_APP_ORIGIN`),
  CORS_ALLOWED_ORIGINS: zArray(z.string().min(1), [
    // for admin app
    `http://127.0.0.1:3010`,
    `http://localhost:3010`,
    `http://[::1]:3010`,
    `https://remoola-turbo-2-admin.vercel.app`,
    // for consumer app
    `http://127.0.0.1:3001`,
    `http://localhost:3001`,
    `http://[::1]:3001`,
    `https://remoola-turbo-2-consumer.vercel.app`,
    // for api
    `http://127.0.0.1:3333`,
    `http://localhost:3333`,
    `http://[::1]:3333`,
    `https://remoola-turbo-2-api.vercel.app`,
  ]),
};

const google = {
  GOOGLE_API_KEY: z.string().default(`GOOGLE_API_KEY`),
  GOOGLE_CLIENT_ID: z.string().default(`GOOGLE_CLIENT_ID`),
  GOOGLE_CLIENT_SECRET: z.string().default(`GOOGLE_CLIENT_SECRET`),
  GOOGLE_CALENDAR_SCOPES: zArray(z.string().min(1), []),
};

const jwt = {
  JWT_SECRET: z.string().default(`JWT_SECRET`),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default(`15m`),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default(`168h`),
};

const authLockout = {
  AUTH_MAX_FAILED_ATTEMPTS: z.coerce.number().min(1).max(20).default(5),
  AUTH_LOCKOUT_DURATION_MINUTES: z.coerce.number().min(1).max(120).default(15),
  AUTH_PER_EMAIL_RATE_LIMIT: z.coerce.number().min(5).max(50).default(10),
  AUTH_PER_EMAIL_RATE_WINDOW_MINUTES: z.coerce.number().min(1).max(60).default(15),
};

const nodemailer = {
  NODEMAILER_SMTP_HOST: z.string().default(`NODEMAILER_SMTP_HOST`),
  NODEMAILER_SMTP_PORT: z.coerce.number().default(587),
  NODEMAILER_SMTP_USER: z.string().default(`NODEMAILER_SMTP_USER`),
  NODEMAILER_SMTP_USER_PASS: z.string().default(`NODEMAILER_SMTP_USER_PASS`),
  NODEMAILER_SMTP_DEFAULT_FROM: z.string().default(`noreply@wirebill.com`),
};

const stripe = {
  STRIPE_PUBLISHABLE_KEY: z.string().default(`STRIPE_PUBLISHABLE_KEY`),
  STRIPE_SECRET_KEY: z.string().default(`STRIPE_SECRET_KEY`),
  STRIPE_WEBHOOK_SECRET: z.string().default(`STRIPE_WEBHOOK_SECRET`),
  STRIPE_WEBHOOK_SECRET_BILLING: z.string().default(`STRIPE_WEBHOOK_SECRET_BILLING`),
};

const aws = {
  AWS_FILE_UPLOAD_MAX_SIZE_BYTES: z.coerce.number().default(50000000),
  AWS_ACCESS_KEY_ID: z.string().default(`AWS_ACCESS_KEY_ID`),
  AWS_SECRET_ACCESS_KEY: z.string().default(`AWS_SECRET_ACCESS_KEY`),
  AWS_REGION: z.string().default(`AWS_REGION`),
  AWS_BUCKET: z.string().default(`wirebill-v2`),
};

const logs = {
  LONG_LOGS_ENABLED: zBoolean(false).optional().default(false),
};

const app = {
  ADMIN_EMAIL: z.string().default(`simplelogin-newsletter.djakm@simplelogin.com`),
  SECURE_SESSION_SECRET: z.string().optional().default(`SECURE_SESSION_SECRET`),
  DEFAULT_ADMIN_EMAIL: z.string().default(`regular.admin@wirebill.com`),
  DEFAULT_ADMIN_PASSWORD: z.string().default(`RegularWirebill@Admin123!`),
  SUPER_ADMIN_EMAIL: z.string().default(`super.admin@wirebill.com`),
  SUPER_ADMIN_PASSWORD: z.string().default(`SuperWirebill@Admin123!`),
};

const debugging = {
  DEBUG_ALLOWED: zBoolean(false).optional().default(false),
};

const ngrok = {
  NGROK_AUTH_TOKEN: z.string().default(`NGROK_AUTH_TOKEN`),
  NGROK_DOMAIN: z.string().default(`NGROK_DOMAIN`),
};

const vercel = {
  VERCEL: z.coerce.number().optional().default(0),
};

const security = {
  HELMET_ENABLED: z.string().default(`DISABLED`),
  COOKIE_SECURE: zBoolean(false).optional().default(false),
};

const common = {
  // probably should be in consumer-exchange.service.ts but put here to avoid importing envs in service file
  EXCHANGE_RATE_MAX_AGE_HOURS: z.coerce.number().optional().default(24),
};

const schema = z.object({
  ...node,
  ...database,
  ...nest,
  ...google,
  ...jwt,
  ...authLockout,
  ...nodemailer,
  ...stripe,
  ...aws,
  ...logs,
  ...app,
  ...debugging,
  ...ngrok,
  ...vercel,
  ...security,
  ...common,
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(JSON.stringify(parsed.error, null, 2));

export const envs = { ...parsed.data, ENVIRONMENT, environments };

/** Cookie maxAge in ms. Derived from JWT_ACCESS_TOKEN_EXPIRES_IN (fintech-safe default: 15m). */
export const JWT_ACCESS_TTL = parseExpiresToMs(envs.JWT_ACCESS_TOKEN_EXPIRES_IN);
/** Cookie maxAge in ms. Derived from JWT_REFRESH_TOKEN_EXPIRES_IN (default: 168h = 7d). */
export const JWT_REFRESH_TTL = parseExpiresToMs(envs.JWT_REFRESH_TOKEN_EXPIRES_IN);
/** JWT sign expiresIn in seconds (number). */
export const JWT_ACCESS_TTL_SECONDS = Math.round(JWT_ACCESS_TTL / 1000);
/** JWT sign expiresIn in seconds (number). */
export const JWT_REFRESH_TTL_SECONDS = Math.round(JWT_REFRESH_TTL / 1000);
