describe(`envs`, () => {
  const ORIGINAL_ENV = process.env;

  async function loadEnvModule(overrides: Record<string, string | undefined> = {}) {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, ...overrides };
    return await import(`./envs`);
  }

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.resetModules();
  });

  it(`defaults AUTH_PER_EMAIL_RATE_LIMIT to 50`, async () => {
    const { envs } = await loadEnvModule({ NODE_ENV: `test` });
    expect(envs.AUTH_PER_EMAIL_RATE_LIMIT).toBe(50);
  });

  it(`builds DATABASE_URL from POSTGRES_* when DATABASE_URL is missing`, async () => {
    const { envs } = await loadEnvModule({
      NODE_ENV: `test`,
      DATABASE_URL: undefined,
      POSTGRES_HOST: `db.local`,
      POSTGRES_PORT: `6543`,
      POSTGRES_USER: `app_user`,
      POSTGRES_PASSWORD: `p@ss word`,
      POSTGRES_DB: `ledger`,
    });

    expect(envs.DATABASE_URL).toBe(`postgresql://app_user:p%40ss%20word@db.local:6543/ledger`);
    expect(process.env.DATABASE_URL).toBe(envs.DATABASE_URL);
  });

  it(`fails closed in production-like environments when placeholder secrets are still configured`, async () => {
    await expect(
      loadEnvModule({
        NODE_ENV: `production`,
        COOKIE_SECURE: `true`,
        JWT_ACCESS_SECRET: `JWT_ACCESS_SECRET`,
        JWT_REFRESH_SECRET: `JWT_REFRESH_SECRET`,
        SECURE_SESSION_SECRET: `SECURE_SESSION_SECRET`,
        STRIPE_SECRET_KEY: `STRIPE_SECRET_KEY`,
        STRIPE_WEBHOOK_SECRET: `STRIPE_WEBHOOK_SECRET`,
        NEST_APP_EXTERNAL_ORIGIN: `NEST_APP_EXTERNAL_ORIGIN`,
      }),
    ).rejects.toThrow(/must be configured with a non-placeholder, non-empty value/);
  });

  it(`fails closed in production-like environments when critical secrets are blank`, async () => {
    await expect(
      loadEnvModule({
        NODE_ENV: `staging`,
        COOKIE_SECURE: `true`,
        JWT_ACCESS_SECRET: ` `,
        JWT_REFRESH_SECRET: `secret-refresh`,
        SECURE_SESSION_SECRET: `session-secret`,
        STRIPE_SECRET_KEY: `sk_live_test`,
        STRIPE_WEBHOOK_SECRET: `whsec_live_test`,
        NEST_APP_EXTERNAL_ORIGIN: `https://api.example.com`,
      }),
    ).rejects.toThrow(/non-placeholder, non-empty value/);
  });

  it(`fails closed in production-like environments when access and refresh secrets match`, async () => {
    await expect(
      loadEnvModule({
        NODE_ENV: `production`,
        COOKIE_SECURE: `true`,
        JWT_ACCESS_SECRET: `same-secret`,
        JWT_REFRESH_SECRET: `same-secret`,
        SECURE_SESSION_SECRET: `session-secret`,
        STRIPE_SECRET_KEY: `sk_live_test`,
        STRIPE_WEBHOOK_SECRET: `whsec_live_test`,
        NEST_APP_EXTERNAL_ORIGIN: `https://api.example.com`,
      }),
    ).rejects.toThrow(/must be distinct/);
  });

  it(`disables public swagger and sensitive health endpoints by default in production-like environments`, async () => {
    const { envs } = await loadEnvModule({
      NODE_ENV: `staging`,
      COOKIE_SECURE: `true`,
      JWT_ACCESS_SECRET: `secret-access`,
      JWT_REFRESH_SECRET: `secret-refresh`,
      SECURE_SESSION_SECRET: `session-secret`,
      STRIPE_SECRET_KEY: `sk_live_test`,
      STRIPE_WEBHOOK_SECRET: `whsec_live_test`,
      NEST_APP_EXTERNAL_ORIGIN: `https://api.example.com`,
    });

    expect(envs.SWAGGER_ENABLED).toBe(false);
    expect(envs.PUBLIC_DETAILED_HEALTH_ENABLED).toBe(false);
    expect(envs.PUBLIC_MAIL_TRANSPORT_HEALTH_ENABLED).toBe(false);
    expect(envs.HEALTH_TEST_EMAIL_ENABLED).toBe(false);
    expect(envs.ALLOW_REQUESTS_WITHOUT_ORIGIN).toBe(false);
    expect(envs.NGROK_ENABLED).toBe(false);
  });

  it(`requires explicit non-placeholder ngrok credentials when NGROK_ENABLED=true`, async () => {
    await expect(
      loadEnvModule({
        NODE_ENV: `development`,
        NGROK_ENABLED: `true`,
        NGROK_AUTH_TOKEN: ` `,
        NGROK_DOMAIN: `NGROK_DOMAIN`,
      }),
    ).rejects.toThrow(/NGROK_ENABLED requires NGROK_AUTH_TOKEN and NGROK_DOMAIN/);
  });
});
