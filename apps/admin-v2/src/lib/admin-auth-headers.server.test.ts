import { buildAdminMutationHeaders } from './admin-auth-headers.server';

describe(`buildAdminMutationHeaders`, () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ADMIN_V2_APP_ORIGIN: `https://admin-v2.example.com`,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it(`forwards cookies and injects csrf token`, () => {
    const headers = buildAdminMutationHeaders(`foo=bar; admin_csrf_token=csrf-token`, {
      'content-type': `application/json`,
    });

    expect(headers.Cookie).toBe(`foo=bar; admin_csrf_token=csrf-token`);
    expect(headers.origin).toBe(`https://admin-v2.example.com`);
    expect(headers[`x-csrf-token`]).toBe(`csrf-token`);
    expect(headers[`content-type`]).toBe(`application/json`);
  });
});
