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

  it(`falls back to NEXT_PUBLIC_APP_ORIGIN when admin origin is unset`, () => {
    delete process.env.ADMIN_V2_APP_ORIGIN;
    process.env.NEXT_PUBLIC_APP_ORIGIN = `https://fallback.example.com`;

    expect(getRequestOrigin()).toBe(`https://fallback.example.com`);
  });

  it(`throws when no explicit origin is configured`, () => {
    delete process.env.ADMIN_V2_APP_ORIGIN;
    delete process.env.NEXT_PUBLIC_APP_ORIGIN;

    expect(() => getRequestOrigin()).toThrow(`Admin v2 app origin is not configured`);
  });
});
