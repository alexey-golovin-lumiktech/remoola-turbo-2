import z, { type ZodType } from 'zod';

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
function isProductionLikeNodeEnv(value: string): boolean {
  return value === ENVIRONMENT.PRODUCTION || value === ENVIRONMENT.STAGING;
}

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

function zOptionalBoolean(): ZodType<boolean | undefined> {
  return z.preprocess((raw) => {
    if (raw == null || raw === ``) return undefined;
    if (typeof raw === `string`) {
      const lowered = raw.trim().toLowerCase();
      if ([`true`, `1`, `yes`, `y`].includes(lowered)) return true;
      if ([`false`, `0`, `no`, `n`].includes(lowered)) return false;
    }
    return typeof raw === `boolean` ? raw : undefined;
  }, z.boolean().optional());
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
  /** Public marketing / invoice branding website; override per deployment. */
  PUBLIC_BRAND_WEBSITE_URL: z.string().url().default(`https://remoola.app`),
  CONSUMER_APP_ORIGIN: z.string().default(`CONSUMER_APP_ORIGIN`),
  CONSUMER_MOBILE_APP_ORIGIN: z.string().default(`CONSUMER_MOBILE_APP_ORIGIN`),
  CONSUMER_CSS_GRID_APP_ORIGIN: z.string().default(`CONSUMER_CSS_GRID_APP_ORIGIN`),
  ADMIN_APP_ORIGIN: z.string().default(`ADMIN_APP_ORIGIN`),
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
  NGROK_OAUTH_REDIRECT_ENABLED: zBoolean(false).optional().default(false),
};

const vercel = {
  VERCEL: z.coerce.number().optional().default(0),
};

const security = {
  COOKIE_SECURE: zBoolean(false).optional().default(false),
};

const runtimePolicy = {
  SWAGGER_ENABLED: zOptionalBoolean(),
  PUBLIC_DETAILED_HEALTH_ENABLED: zOptionalBoolean(),
  PUBLIC_MAIL_TRANSPORT_HEALTH_ENABLED: zOptionalBoolean(),
  HEALTH_TEST_EMAIL_ENABLED: zOptionalBoolean(),
  NGROK_ENABLED: zOptionalBoolean(),
};

const common = {
  // probably should be in consumer-exchange.service.ts but put here to avoid importing envs in service file
  EXCHANGE_RATE_MAX_AGE_HOURS: z.coerce.number().optional().default(24),
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
  ...runtimePolicy,
  ...common,
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(JSON.stringify(parsed.error, null, 2));

function buildDatabaseUrl(data: z.infer<typeof schema>): string {
  if (data.DATABASE_URL?.trim()) return data.DATABASE_URL.trim();
  const user = encodeURIComponent(data.POSTGRES_USER);
  const password = encodeURIComponent(data.POSTGRES_PASSWORD);
  const host = data.POSTGRES_HOST.trim();
  const port = data.POSTGRES_PORT.trim();
  const db = data.POSTGRES_DB.trim();
  return `postgresql://${user}:${password}@${host}:${port}/${db}`;
}

function normalizeConfiguredValue(value: string): string {
  return String(value).trim();
}

function assertProductionLikePolicy(
  data: z.infer<typeof schema> & {
    DATABASE_URL: string;
    SWAGGER_ENABLED: boolean;
    PUBLIC_DETAILED_HEALTH_ENABLED: boolean;
    PUBLIC_MAIL_TRANSPORT_HEALTH_ENABLED: boolean;
    HEALTH_TEST_EMAIL_ENABLED: boolean;
    NGROK_ENABLED: boolean;
  },
): void {
  if (!isProductionLikeNodeEnv(data.NODE_ENV)) return;

  const placeholderLookup = [
    [`JWT_ACCESS_SECRET`, `JWT_ACCESS_SECRET`],
    [`JWT_REFRESH_SECRET`, `JWT_REFRESH_SECRET`],
    [`SECURE_SESSION_SECRET`, `SECURE_SESSION_SECRET`],
    [`STRIPE_SECRET_KEY`, `STRIPE_SECRET_KEY`],
    [`STRIPE_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`],
    [`NEST_APP_EXTERNAL_ORIGIN`, `NEST_APP_EXTERNAL_ORIGIN`],
  ] as const;

  for (const [key, placeholder] of placeholderLookup) {
    const value = normalizeConfiguredValue(data[key]);
    if (!value || value === placeholder) {
      throw new Error(
        `${key} must be configured with a non-placeholder, non-empty value when NODE_ENV=${data.NODE_ENV}`,
      );
    }
  }

  const accessSecret = normalizeConfiguredValue(data.JWT_ACCESS_SECRET);
  const refreshSecret = normalizeConfiguredValue(data.JWT_REFRESH_SECRET);
  if (accessSecret === refreshSecret) {
    throw new Error(`JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct when NODE_ENV=${data.NODE_ENV}`);
  }

  if (!data.COOKIE_SECURE) {
    throw new Error(`COOKIE_SECURE must be true when NODE_ENV=${data.NODE_ENV}`);
  }
  if (data.ALLOW_PRODUCTION_BOOTSTRAP_SEED) {
    throw new Error(`ALLOW_PRODUCTION_BOOTSTRAP_SEED must be false when NODE_ENV=${data.NODE_ENV}`);
  }
  if (data.NGROK_ENABLED) {
    throw new Error(`NGROK_ENABLED must be false when NODE_ENV=${data.NODE_ENV}`);
  }
}

const productionLike = isProductionLikeNodeEnv(parsed.data.NODE_ENV);
const effective = {
  ...parsed.data,
  DATABASE_URL: buildDatabaseUrl(parsed.data),
  SWAGGER_ENABLED: parsed.data.SWAGGER_ENABLED ?? !productionLike,
  PUBLIC_DETAILED_HEALTH_ENABLED: parsed.data.PUBLIC_DETAILED_HEALTH_ENABLED ?? !productionLike,
  PUBLIC_MAIL_TRANSPORT_HEALTH_ENABLED: parsed.data.PUBLIC_MAIL_TRANSPORT_HEALTH_ENABLED ?? !productionLike,
  HEALTH_TEST_EMAIL_ENABLED: parsed.data.HEALTH_TEST_EMAIL_ENABLED ?? !productionLike,
  NGROK_ENABLED: parsed.data.NGROK_ENABLED ?? false,
};

if (
  effective.NGROK_ENABLED &&
  ([effective.NGROK_AUTH_TOKEN, effective.NGROK_DOMAIN].some((value) => !normalizeConfiguredValue(value)) ||
    normalizeConfiguredValue(effective.NGROK_AUTH_TOKEN) === `NGROK_AUTH_TOKEN` ||
    normalizeConfiguredValue(effective.NGROK_DOMAIN) === `NGROK_DOMAIN`)
) {
  throw new Error(
    `NGROK_ENABLED requires NGROK_AUTH_TOKEN and NGROK_DOMAIN to be configured with non-placeholder values`,
  );
}

assertProductionLikePolicy(effective);
process.env.DATABASE_URL = effective.DATABASE_URL;

/** Cookie maxAge in ms. Derived from JWT_ACCESS_TOKEN_EXPIRES_IN (fintech-safe default: 15m). */
const JWT_ACCESS_TOKEN_EXPIRES_IN = parseExpiresToMs(effective.JWT_ACCESS_TOKEN_EXPIRES_IN);
/** Cookie maxAge in ms. Derived from JWT_REFRESH_TOKEN_EXPIRES_IN (default: 168h = 7d). */
const JWT_REFRESH_TOKEN_EXPIRES_IN = parseExpiresToMs(effective.JWT_REFRESH_TOKEN_EXPIRES_IN);
/** JWT sign expiresIn in seconds (number). */
const JWT_ACCESS_TTL_SECONDS = Math.round(JWT_ACCESS_TOKEN_EXPIRES_IN / 1000);
/** JWT sign expiresIn in seconds (number). */
const JWT_REFRESH_TTL_SECONDS = Math.round(JWT_REFRESH_TOKEN_EXPIRES_IN / 1000);

export const envs = {
  ...effective,
  ENVIRONMENT,
  environments,
  isProductionLike: productionLike,
  JWT_ACCESS_TOKEN_EXPIRES_IN,
  JWT_REFRESH_TOKEN_EXPIRES_IN,
  JWT_ACCESS_TTL_SECONDS,
  JWT_REFRESH_TTL_SECONDS,
};
