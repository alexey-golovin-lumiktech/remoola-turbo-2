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

  it(`rejects identical access and refresh secrets in production-like environments`, async () => {
    await expect(
      loadEnvModule({
        NODE_ENV: `production`,
        JWT_ACCESS_SECRET: `same-secret`,
        JWT_REFRESH_SECRET: `same-secret`,
      }),
    ).rejects.toThrow(/must be distinct/);
  });
});
