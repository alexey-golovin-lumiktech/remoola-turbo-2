import z from 'zod';

import { zBoolean, zOptionalBoolean } from './envs-parsers';

export const ENVIRONMENT = {
  PRODUCTION: `production`,
  STAGING: `staging`,
  DEVELOPMENT: `development`,
  TEST: `test`,
} as const;

export const environments = Object.values(ENVIRONMENT);

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
  PUBLIC_BRAND_WEBSITE_URL: z.url().default(`https://remoola.app`),
  CONSUMER_CSS_GRID_APP_ORIGIN: z.string().default(`CONSUMER_CSS_GRID_APP_ORIGIN`),
  ADMIN_V2_APP_ORIGIN: z.string().default(`ADMIN_V2_APP_ORIGIN`),
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
  BREVO_API_BASE_URL: z.url().default(`https://api.brevo.com/v3`),
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
  CRON_SECRET: z.string().default(`CRON_SECRET`),
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

const businessPolicy = {
  EXCHANGE_RATE_MAX_AGE_HOURS: z.coerce.number().optional().default(24),
  ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS: z.string().optional().default(``),
};

const consumerActionLog = {
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

export const schema = z.object({
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
  ...businessPolicy,
  ...consumerActionLog,
});
