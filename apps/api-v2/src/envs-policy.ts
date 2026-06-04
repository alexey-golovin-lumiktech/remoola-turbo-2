import z from 'zod';

type NgrokPolicyInputs = {
  NGROK_ENABLED: boolean;
  NGROK_AUTH_TOKEN: string;
  NGROK_DOMAIN: string;
};

type ProductionLikePolicyInputs = {
  NODE_ENV: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  SECURE_SESSION_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  NEST_APP_EXTERNAL_ORIGIN: string;
  CONSUMER_CSS_GRID_APP_ORIGIN: string;
  ADMIN_V2_APP_ORIGIN: string;
  CRON_SECRET: string;
  BREVO_API_KEY: string;
  BREVO_DEFAULT_FROM_EMAIL: string;
  COOKIE_SECURE: boolean;
  NGROK_ENABLED: boolean;
  ALLOW_PRODUCTION_BOOTSTRAP_SEED: boolean;
  DEFAULT_ADMIN_PASSWORD: string;
  SUPER_ADMIN_PASSWORD: string;
};

function normalizeConfiguredValue(value: string): string {
  return String(value).trim();
}

export function isProductionLikeNodeEnv(value: string): boolean {
  return value === `production` || value === `staging`;
}

export function isBootstrapSeedProcess(argv: string[]): boolean {
  return argv.some((arg) => /(^|[/\\])bootstrap-seed\.[cm]?[jt]s$/.test(arg));
}

export function assertNgrokConfiguration(data: NgrokPolicyInputs): void {
  if (
    data.NGROK_ENABLED &&
    ([data.NGROK_AUTH_TOKEN, data.NGROK_DOMAIN].some((value) => !normalizeConfiguredValue(value)) ||
      normalizeConfiguredValue(data.NGROK_AUTH_TOKEN) === `NGROK_AUTH_TOKEN` ||
      normalizeConfiguredValue(data.NGROK_DOMAIN) === `NGROK_DOMAIN`)
  ) {
    throw new Error(
      `NGROK_ENABLED requires NGROK_AUTH_TOKEN and NGROK_DOMAIN to be configured with non-placeholder values`,
    );
  }
}

export function assertProductionLikePolicy(
  data: ProductionLikePolicyInputs,
  options: { isBootstrapSeedEntry: boolean },
): void {
  if (!isProductionLikeNodeEnv(data.NODE_ENV)) return;

  const placeholderLookup = [
    [`JWT_ACCESS_SECRET`, `JWT_ACCESS_SECRET`],
    [`JWT_REFRESH_SECRET`, `JWT_REFRESH_SECRET`],
    [`SECURE_SESSION_SECRET`, `SECURE_SESSION_SECRET`],
    [`STRIPE_SECRET_KEY`, `STRIPE_SECRET_KEY`],
    [`STRIPE_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`],
    [`NEST_APP_EXTERNAL_ORIGIN`, `NEST_APP_EXTERNAL_ORIGIN`],
    [`CONSUMER_CSS_GRID_APP_ORIGIN`, `CONSUMER_CSS_GRID_APP_ORIGIN`],
    [`ADMIN_V2_APP_ORIGIN`, `ADMIN_V2_APP_ORIGIN`],
    [`CRON_SECRET`, `CRON_SECRET`],
    [`BREVO_API_KEY`, `BREVO_API_KEY`],
    [`BREVO_DEFAULT_FROM_EMAIL`, `BREVO_DEFAULT_FROM_EMAIL`],
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
  if (data.NGROK_ENABLED) {
    throw new Error(`NGROK_ENABLED must be false when NODE_ENV=${data.NODE_ENV}`);
  }
  if (data.ALLOW_PRODUCTION_BOOTSTRAP_SEED && !options.isBootstrapSeedEntry) {
    throw new Error(
      `ALLOW_PRODUCTION_BOOTSTRAP_SEED can only be true for the bootstrap seed script when NODE_ENV=${data.NODE_ENV}`,
    );
  }
  if (data.ALLOW_PRODUCTION_BOOTSTRAP_SEED) {
    const defaultSeedCredentials = [
      [`DEFAULT_ADMIN_PASSWORD`, `RegularWirebill@Admin123!`],
      [`SUPER_ADMIN_PASSWORD`, `SuperWirebill@Admin123!`],
    ] as const;
    for (const [key, defaultValue] of defaultSeedCredentials) {
      const value = normalizeConfiguredValue(data[key]);
      if (!value || value === defaultValue) {
        throw new Error(
          `${key} must be configured with a non-default, non-empty value for production-like bootstrap seed`,
        );
      }
    }
  }

  const brevoFromEmail = normalizeConfiguredValue(data.BREVO_DEFAULT_FROM_EMAIL);
  if (!z.email().safeParse(brevoFromEmail).success) {
    throw new Error(`BREVO_DEFAULT_FROM_EMAIL must be a valid email address when NODE_ENV=${data.NODE_ENV}`);
  }
}
