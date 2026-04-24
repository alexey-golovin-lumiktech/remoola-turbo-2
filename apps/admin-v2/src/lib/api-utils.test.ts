import { buildAuthMutationForwardHeaders } from './api-utils';

describe(`buildAuthMutationForwardHeaders`, () => {
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

  it(`preserves a valid browser origin`, () => {
    const headers = buildAuthMutationForwardHeaders(
      new Headers({
        origin: `https://preview.example.com`,
        cookie: `foo=bar`,
      }),
    );

    expect(headers.get(`origin`)).toBe(`https://preview.example.com`);
    expect(headers.get(`cookie`)).toBe(`foo=bar`);
  });

  it(`falls back to configured app origin when browser origin is absent`, () => {
    const headers = buildAuthMutationForwardHeaders(
      new Headers({
        cookie: `foo=bar`,
      }),
    );

    expect(headers.get(`origin`)).toBe(`https://admin-v2.example.com`);
  });
});
