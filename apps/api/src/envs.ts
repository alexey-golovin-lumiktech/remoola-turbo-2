import z, { type ZodArray, type ZodDefault, type ZodType } from 'zod';

/**
 * Parse expiry string (e.g. '15m', '168h', '1d', '60s') to milliseconds.
 * Used for cookie maxAge and any ms-based TTL. Fintech-safe defaults: short access (15m), limited refresh (7d).
 */
function parseExpiresToMs(value: string): number {
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

const ENVIRONMENT = {
  PRODUCTION: `production`,
  STAGING: `staging`,
  DEVELOPMENT: `development`,
  TEST: `test`,
} as const;
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

function zBoolean(fallback = false): ZodType<boolean> {
  return z.preprocess((raw) => {
    if (typeof raw === `string`) {
      const lowered = raw.trim().toLowerCase();
      if ([`true`, `1`, `yes`, `y`].includes(lowered)) return true;
      if ([`false`, `0`, `no`, `n`].includes(lowered)) return false;
    }
    return typeof raw === `boolean` ? raw : fallback;
  }, z.boolean());
}

function zArray<T extends ZodType>(itemSchema: T, fallback: z.infer<T>[] = []): ZodDefault<ZodArray<T>> {
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
  POSTGRES_HOST: z.string().default(`127.0.0.1`),
  POSTGRES_USER: z.string().default(`wirebill`),
  POSTGRES_PASSWORD: z.string().default(`wirebill`),
  POSTGRES_DB: z.string().default(`remoola`),
  POSTGRES_PORT: z.string().default(`5433`),
  POSTGRES_TIMEZONE: z.string().default(`UTC`),
};

const nest = {
  PORT: z.coerce.number().optional().default(3000),
  NEST_APP_EXTERNAL_ORIGIN: z.string().default(`NEST_APP_EXTERNAL_ORIGIN`),
  CONSUMER_APP_ORIGIN: z.string().default(`CONSUMER_APP_ORIGIN`),
  CONSUMER_MOBILE_APP_ORIGIN: z.string().default(`CONSUMER_MOBILE_APP_ORIGIN`),
  ADMIN_APP_ORIGIN: z.string().default(`ADMIN_APP_ORIGIN`),
  CORS_ALLOWED_ORIGINS: zArray(z.string().min(1), [
    // for consumer-mobile app (port 3002)
    `http://127.0.0.1:3002`,
    `http://localhost:3002`,
    `https://remoola-turbo-2-consumer-mobile.vercel.app`,
    // for admin app (port 3010)
    `http://127.0.0.1:3010`,
    `http://localhost:3010`,
    `https://remoola-turbo-2-admin.vercel.app`,
    // for consumer app (port 3001)
    `http://127.0.0.1:3001`,
    `http://localhost:3001`,
    `https://remoola-turbo-2-consumer.vercel.app`,
    // for api (port 3333)
    `http://127.0.0.1:3333`,
    `http://localhost:3333`,
    `https://remoola-turbo-2-api.vercel.app`,
  ]),
};

const google = {
  GOOGLE_CLIENT_ID: z.string().default(`GOOGLE_CLIENT_ID`),
  GOOGLE_CLIENT_SECRET: z.string().default(`GOOGLE_CLIENT_SECRET`),
};

const jwt = {
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default(`15m`),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default(`168h`),
  JWT_ACCESS_SECRET: z.string().default(`JWT_ACCESS_SECRET`),
  JWT_REFRESH_SECRET: z.string().default(`JWT_REFRESH_SECRET`),
};

const authLockout = {
  AUTH_MAX_FAILED_ATTEMPTS: z.coerce.number().min(1).max(20).default(5),
  AUTH_LOCKOUT_DURATION_MINUTES: z.coerce.number().min(1).max(120).default(15),
  AUTH_PER_EMAIL_RATE_LIMIT: z.coerce.number().min(5).max(50).default(50),
  AUTH_PER_EMAIL_RATE_WINDOW_MINUTES: z.coerce.number().min(1).max(60).default(15),
};

const mail = {
  BREVO_API_KEY: z.string().default(`BREVO_API_KEY`),
  BREVO_API_BASE_URL: z.string().default(`https://api.brevo.com/v3`),
  BREVO_DEFAULT_FROM_EMAIL: z.string().default(`BREVO_DEFAULT_FROM_EMAIL`),
  BREVO_DEFAULT_FROM_NAME: z.string().default(`Wirebill`),
  BREVO_VERIFY_ON_BOOT: zBoolean(true).optional().default(false),
};

const stripe = {
  STRIPE_SECRET_KEY: z.string().default(`STRIPE_SECRET_KEY`),
  STRIPE_WEBHOOK_SECRET: z.string().default(`STRIPE_WEBHOOK_SECRET`),
};

const aws = {
  AWS_ACCESS_KEY_ID: z.string().default(`AWS_ACCESS_KEY_ID`),
  AWS_SECRET_ACCESS_KEY: z.string().default(`AWS_SECRET_ACCESS_KEY`),
  AWS_REGION: z.string().default(`AWS_REGION`),
  AWS_BUCKET: z.string().default(`wirebill-v2`),
};

const app = {
  SECURE_SESSION_SECRET: z.string().optional().default(`SECURE_SESSION_SECRET`),
  DEFAULT_ADMIN_EMAIL: z.string().default(`regular.admin@wirebill.com`),
  DEFAULT_ADMIN_PASSWORD: z.string().default(`RegularWirebill@Admin123!`),
  SUPER_ADMIN_EMAIL: z.string().default(`super.admin@wirebill.com`),
  SUPER_ADMIN_PASSWORD: z.string().default(`SuperWirebill@Admin123!`),
  ALLOW_PRODUCTION_BOOTSTRAP_SEED: zBoolean(false).optional().default(false),
};

const ngrok = {
  NGROK_AUTH_TOKEN: z.string().default(`NGROK_AUTH_TOKEN`),
  NGROK_DOMAIN: z.string().default(`NGROK_DOMAIN`),
};

const vercel = {
  VERCEL: z.coerce.number().optional().default(0),
};

const security = {
  COOKIE_SECURE: zBoolean(false).optional().default(false),
};

const common = {
  // probably should be in consumer-exchange.service.ts but put here to avoid importing envs in service file
  EXCHANGE_RATE_MAX_AGE_HOURS: z.coerce.number().optional().default(24),
  CONSUMER_DEVICE_ID_ALLOW_UNSIGNED_FALLBACK: zBoolean(false).optional().default(false),
  CONSUMER_ACTION_LOG_RETENTION_DAYS: z.coerce.number().min(7).max(3650).default(30),
  CONSUMER_ACTION_LOG_PARTITION_PRECREATE_MONTHS: z.coerce.number().min(1).max(12).default(2),
  CONSUMER_ACTION_LOG_MAINTENANCE_CRON: z.string().default(`17 */6 * * *`),
  CONSUMER_ACTION_LOG_RETENTION_CRON: z.string().default(`23 3 * * *`),
  CONSUMER_ACTION_LOG_BACKPRESSURE_ENABLED: zBoolean(true).optional().default(true),
  CONSUMER_ACTION_LOG_LOW_PRIORITY_MAX_PER_SECOND: z.coerce.number().min(10).max(5000).default(250),
  CONSUMER_ACTION_LOG_OVERFLOW_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  CONSUMER_ACTION_LOG_BACKPRESSURE_SUMMARY_INTERVAL_SECONDS: z.coerce.number().min(5).max(3600).default(60),
  CONSUMER_ACTION_LOG_BACKPRESSURE_SUMMARY_MIN_DROPPED: z.coerce.number().min(1).max(100000).default(10),
  CONSUMER_ACTION_LOG_CALLBACK_FAILURE_RATE_LIMIT_ENABLED: zBoolean(true).optional().default(true),
  CONSUMER_ACTION_LOG_CALLBACK_FAILURE_MAX_PER_WINDOW: z.coerce.number().min(1).max(10000).default(30),
  CONSUMER_ACTION_LOG_CALLBACK_FAILURE_WINDOW_SECONDS: z.coerce.number().min(1).max(3600).default(60),
  CONSUMER_ACTION_LOG_STORE_IP_ADDRESS: zBoolean(false).optional().default(false),
  CONSUMER_ACTION_LOG_STORE_USER_AGENT: zBoolean(false).optional().default(false),
  CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK: zBoolean(false).optional().default(false),
};

const schema = z.object({
  ...node,
  ...database,
  ...nest,
  ...google,
  ...jwt,
  ...authLockout,
  ...mail,
  ...stripe,
  ...aws,
  ...app,
  ...ngrok,
  ...vercel,
  ...security,
  ...common,
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(JSON.stringify(parsed.error, null, 2));

/** Cookie maxAge in ms. Derived from JWT_ACCESS_TOKEN_EXPIRES_IN (fintech-safe default: 15m). */
const JWT_ACCESS_TOKEN_EXPIRES_IN = parseExpiresToMs(parsed.data.JWT_ACCESS_TOKEN_EXPIRES_IN);
/** Cookie maxAge in ms. Derived from JWT_REFRESH_TOKEN_EXPIRES_IN (default: 168h = 7d). */
const JWT_REFRESH_TOKEN_EXPIRES_IN = parseExpiresToMs(parsed.data.JWT_REFRESH_TOKEN_EXPIRES_IN);
/** JWT sign expiresIn in seconds (number). */
const JWT_ACCESS_TTL_SECONDS = Math.round(JWT_ACCESS_TOKEN_EXPIRES_IN / 1000);
/** JWT sign expiresIn in seconds (number). */
const JWT_REFRESH_TTL_SECONDS = Math.round(JWT_REFRESH_TOKEN_EXPIRES_IN / 1000);

export const envs = {
  ...parsed.data,
  ENVIRONMENT,
  environments,
  JWT_ACCESS_TOKEN_EXPIRES_IN,
  JWT_REFRESH_TOKEN_EXPIRES_IN,
  JWT_ACCESS_TTL_SECONDS,
  JWT_REFRESH_TTL_SECONDS,
};
