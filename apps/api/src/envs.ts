import z, { type ZodArray, type ZodDefault, type ZodType, type ZodTypeAny } from 'zod';

export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || `JWT_ACCESS_SECRET`;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `JWT_REFRESH_SECRET`;

export const HOURS_24MS = 86400000 as const;
export const JWT_ACCESS_TTL = HOURS_24MS;
export const JWT_REFRESH_TTL = 604800000 as const;

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

const redis = {
  REDIS_HOST: z.string().default(`127.0.0.1`),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().optional(),
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
  ...nodemailer,
  ...stripe,
  ...aws,
  ...logs,
  ...app,
  ...debugging,
  ...ngrok,
  ...redis,
  ...vercel,
  ...security,
  ...common,
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(JSON.stringify(parsed.error, null, 2));

export const envs = { ...parsed.data, ENVIRONMENT, environments };
