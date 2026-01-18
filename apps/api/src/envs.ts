export const NODE_ENV = process.env.NODE_ENV || `production`;

export const S3_BUCKET = process.env.S3_BUCKET;
export const AWS_REGION = process.env.AWS_REGION;
export const S3_PUBLIC_BASE = process.env.S3_PUBLIC_BASE;

export const COOKIE_SECURE = process.env.COOKIE_SECURE;

export const POSTGRES_TIMEZONE = process.env.POSTGRES_TIMEZONE || `UTC`;
export const POSTGRES_HOST = process.env.POSTGRES_HOST || `127.0.0.1`;
export const POSTGRES_PORT = process.env.POSTGRES_PORT || `5433`;
export const POSTGRES_USER = process.env.POSTGRES_USER || `wirebill`;
export const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || `wirebill`;
export const POSTGRES_DB = process.env.POSTGRES_DB || `wirebill`;
export const POSTGRES_SSL = process.env.POSTGRES_SSL;

export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || `JWT_ACCESS_SECRET`;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `JWT_REFRESH_SECRET`;

export const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

export const HOURS_24MS = 86400000 as const;
export const DAYS_7MS = 604800000 as const;

export const JWT_ACCESS_TTL = HOURS_24MS;
export const JWT_REFRESH_TTL = DAYS_7MS;

import z, { type ZodArray, type ZodDefault, type ZodType, type ZodTypeAny } from 'zod';

const ENVIRONMENT = { PRODUCTION: `production`, STAGING: `staging`, DEVELOPMENT: `development`, TEST: `test` } as const;
const environments = Object.values(ENVIRONMENT);
export type Environment = (typeof ENVIRONMENT)[keyof typeof ENVIRONMENT];

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

export function zArray<T extends ZodTypeAny>(itemSchema: T, fallback: z.infer<T>[] = []): ZodDefault<ZodArray<T>> {
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
  CORS_ALLOWED_ORIGINS: zArray(z.string().min(1), [`http://localhost:3000`, `http://localhost:3001`]),
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

const nodemailer = {
  NODEMAILER_SMTP_HOST: z.string().default(`NODEMAILER_SMTP_HOST`),
  NODEMAILER_SMTP_PORT: z.coerce.number(),
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
  LONG_LOGS_ENABLED: z.coerce.boolean().default(false),
};

const app = {
  ADMIN_EMAIL: z.string().default(`simplelogin-newsletter.djakm@simplelogin.com`),
  SECURE_SESSION_SECRET: z.string().optional().default(`SECURE_SESSION_SECRET`),
  DEFAULT_ADMIN_EMAIL: z.string().default(`admin@wirebill.com`),
  DEFAULT_ADMIN_PASSWORD: z.string().default(`Admin@123!`),
  SUPER_ADMIN_EMAIL: z.string().default(`super@wirebill.com`),
  SUPER_ADMIN_PASSWORD: z.string().default(`Super@123!`),
};

const debugging = {
  DEBUG_ALLOWED: z
    .string()
    .default(`FALSE`)
    .transform((v) => v === `TRUE`)
    .pipe(z.boolean()),
};

const ngrok = {
  NGROK_AUTH_TOKEN: z.string().default(`NGROK_AUTH_TOKEN`),
  NGROK_DOMAIN: z.string().default(`NGROK_DOMAIN`),
};

const redis = {
  REDIS_HOST: z.string().default(`127.0.0.1`),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().optional(),
};

const vercel = {
  VERCEL: z.coerce.number().optional().default(0),
};

const schema = z.object({
  ...node,
  ...database,
  ...nest,
  ...google,
  ...jwt,
  ...nodemailer,
  ...stripe,
  ...aws,
  ...logs,
  ...app,
  ...debugging,
  ...ngrok,
  ...redis,
  ...vercel,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(JSON.stringify(parsed.error, null, 2));

export const envs = { ...parsed.data, ENVIRONMENT, environments };

export const check = (...args: string[]) => {
  for (const arg of args) {
    if (!(arg in envs)) throw new Error(`Missing env: ${arg}`);
    if (envs[arg] === arg) throw new Error(`env: ${arg} is not provided`);
  }
};
