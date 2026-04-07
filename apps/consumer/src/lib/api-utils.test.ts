import { getConsumerCsrfTokenCookieKey } from '@remoola/api-types';

import { appendSetCookies, buildAuthMutationForwardHeaders, buildForwardHeaders, requireJsonBody } from './api-utils';

const TEST_ORIGIN = `http://localhost:3001`;
const TEST_CSRF_COOKIE_KEY = getConsumerCsrfTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: false,
});

describe(`consumer api-utils`, () => {
  const envRef = process.env as Record<string, string | undefined>;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConsumerAppOrigin = process.env.CONSUMER_APP_ORIGIN;
  const originalNextPublicAppOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;

  afterEach(() => {
    envRef.NODE_ENV = originalNodeEnv;
    envRef.CONSUMER_APP_ORIGIN = originalConsumerAppOrigin;
    envRef.NEXT_PUBLIC_APP_ORIGIN = originalNextPublicAppOrigin;
  });

  it(`requireJsonBody accepts valid json`, async () => {
    const req = new Request(`${TEST_ORIGIN}/api/test`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({ ok: true }),
    });

    const result = await requireJsonBody(req as never);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body).toBe(`{"ok":true}`);
    }
  });

  it(`requireJsonBody rejects non-json content type for non-empty body`, async () => {
    const req = new Request(`${TEST_ORIGIN}/api/test`, {
      method: `POST`,
      headers: { 'content-type': `text/plain` },
      body: `abc`,
    });

    const result = await requireJsonBody(req as never);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toMatchObject({ code: `INVALID_CONTENT_TYPE` });
    }
  });

  it(`requireJsonBody rejects invalid json`, async () => {
    const req = new Request(`${TEST_ORIGIN}/api/test`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: `{bad`,
    });

    const result = await requireJsonBody(req as never);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toMatchObject({ code: `INVALID_JSON` });
    }
  });

  it(`requireJsonBody rejects oversized json payload`, async () => {
    const req = new Request(`${TEST_ORIGIN}/api/test`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: `x`.repeat(1024 * 1024 + 1),
    });

    const result = await requireJsonBody(req as never);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(413);
      await expect(result.response.json()).resolves.toMatchObject({ code: `PAYLOAD_TOO_LARGE` });
    }
  });

  it(`requireJsonBody allows empty body when allowEmpty is true`, async () => {
    const req = new Request(`${TEST_ORIGIN}/api/test`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: ``,
    });

    const result = await requireJsonBody(req as never, { allowEmpty: true });
    expect(result).toEqual({ ok: true, body: `` });
  });

  it(`buildForwardHeaders preserves a valid incoming browser origin`, () => {
    envRef.CONSUMER_APP_ORIGIN = `https://consumer.example.com`;
    const headers = buildForwardHeaders(
      new Headers({
        authorization: `legacy-token`,
        origin: `https://preview.example.vercel.app`,
        cookie: `${TEST_CSRF_COOKIE_KEY}=abc`,
        'x-correlation-id': `corr-1`,
        'x-remoola-feature': `on`,
        'x-forwarded-for': `10.0.0.1`,
      }),
    );

    expect(headers.get(`authorization`)).toBeNull();
    expect(headers.get(`origin`)).toBe(`https://preview.example.vercel.app`);
    expect(headers.get(`cookie`)).toBe(`${TEST_CSRF_COOKIE_KEY}=abc`);
    expect(headers.get(`x-csrf-token`)).toBe(`abc`);
    expect(headers.get(`x-correlation-id`)).toBe(`corr-1`);
    expect(headers.get(`x-remoola-feature`)).toBe(`on`);
    expect(headers.get(`x-forwarded-for`)).toBeNull();
  });

  it(`buildAuthMutationForwardHeaders preserves incoming origin and strips host`, () => {
    envRef.CONSUMER_APP_ORIGIN = `https://consumer.example.com`;
    const headers = buildAuthMutationForwardHeaders(
      new Headers({
        authorization: `legacy-token`,
        host: `app.example.com`,
        origin: `https://preview.example.vercel.app`,
        cookie: `${TEST_CSRF_COOKIE_KEY}=abc`,
      }),
    );

    expect(headers.get(`authorization`)).toBeNull();
    expect(headers.get(`host`)).toBeNull();
    expect(headers.get(`origin`)).toBe(`https://preview.example.vercel.app`);
    expect(headers.get(`cookie`)).toBe(`${TEST_CSRF_COOKIE_KEY}=abc`);
    expect(headers.get(`x-csrf-token`)).toBe(`abc`);
  });

  it(`buildForwardHeaders fails fast in production when no canonical origin is configured`, () => {
    envRef.NODE_ENV = `production`;
    delete process.env.CONSUMER_APP_ORIGIN;
    delete process.env.NEXT_PUBLIC_APP_ORIGIN;
    expect(() =>
      buildForwardHeaders(
        new Headers({
          cookie: `${TEST_CSRF_COOKIE_KEY}=abc`,
        }),
      ),
    ).toThrow(`Consumer app origin is not configured`);
  });

  it(`buildForwardHeaders uses a configured canonical origin when one is available`, () => {
    envRef.NODE_ENV = `production`;
    envRef.CONSUMER_APP_ORIGIN = `https://consumer.example.com/path-ignored`;

    const headers = buildForwardHeaders(
      new Headers({
        cookie: `${TEST_CSRF_COOKIE_KEY}=abc`,
      }),
    );

    expect(headers.get(`origin`)).toBe(`https://consumer.example.com`);
  });

  it(`buildForwardHeaders accepts NEXT_PUBLIC_APP_ORIGIN as an explicit canonical env`, () => {
    envRef.NODE_ENV = `production`;
    delete process.env.CONSUMER_APP_ORIGIN;
    envRef.NEXT_PUBLIC_APP_ORIGIN = `consumer.example.com/path-ignored`;

    const headers = buildForwardHeaders(
      new Headers({
        cookie: `${TEST_CSRF_COOKIE_KEY}=abc`,
      }),
    );

    expect(headers.get(`origin`)).toBe(`https://consumer.example.com`);
  });

  it(`appendSetCookies appends all source cookie values`, () => {
    const target = { append: jest.fn() } as unknown as Headers;
    const source = new Headers() as Headers & { getSetCookie?: () => string[] };
    source.getSetCookie = () => [`a=1; Path=/`, `b=2; Path=/`];

    appendSetCookies(target, source);

    expect((target.append as unknown as jest.Mock).mock.calls).toEqual([
      [`set-cookie`, `a=1; Path=/`],
      [`set-cookie`, `b=2; Path=/`],
    ]);
  });
});
