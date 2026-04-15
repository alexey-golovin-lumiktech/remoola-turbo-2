import { getRequestOrigin } from './request-origin';

describe(`getRequestOrigin`, () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it(`prefers ADMIN_V2_APP_ORIGIN`, () => {
    process.env.ADMIN_V2_APP_ORIGIN = `https://admin-v2.example.com`;
    process.env.NEXT_PUBLIC_APP_ORIGIN = `https://fallback.example.com`;

    expect(getRequestOrigin()).toBe(`https://admin-v2.example.com`);
  });

  it(`falls back to localhost in non-production`, () => {
    delete process.env.ADMIN_V2_APP_ORIGIN;
    delete process.env.NEXT_PUBLIC_APP_ORIGIN;
    process.env = { ...process.env, NODE_ENV: `development` };

    expect(getRequestOrigin()).toBe(`http://localhost:3011`);
  });
});
