import { proxyToBackend } from './proxy';

const TEST_ORIGIN = `http://localhost:3010`;

describe(`proxyToBackend`, () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it(`rejects non-json mutation body`, async () => {
    const req = new Request(`${TEST_ORIGIN}/api/admin/test`, {
      method: `POST`,
      headers: { 'content-type': `text/plain` },
      body: `not-json`,
    });

    const res = await proxyToBackend(req as never, `/admin/test`);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ code: `INVALID_CONTENT_TYPE` });
  });

  it(`rejects invalid json mutation body`, async () => {
    const req = new Request(`${TEST_ORIGIN}/api/admin/test`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: `{bad-json`,
    });

    const res = await proxyToBackend(req as never, `/admin/test`);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ code: `INVALID_JSON` });
  });

  it(`rejects oversized mutation body with 413`, async () => {
    const req = new Request(`${TEST_ORIGIN}/api/admin/test`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: `x`.repeat(1024 * 1024 + 1),
    });

    const res = await proxyToBackend(req as never, `/admin/test`);
    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toMatchObject({ code: `PAYLOAD_TOO_LARGE` });
  });

  it(`forwards only allowlisted headers to backend`, async () => {
    (global.fetch as jest.Mock).mockResolvedValue(new Response(`ok`, { status: 200 }));

    const req = new Request(`${TEST_ORIGIN}/api/admin/test?x=1`, {
      method: `GET`,
      headers: {
        authorization: `Bearer token`,
        origin: TEST_ORIGIN,
        cookie: `csrf_token=abc`,
        'x-request-id': `rid-1`,
        'x-remoola-test': `safe`,
        'x-forwarded-for': `10.0.0.1`,
      },
    });

    await proxyToBackend(req as never, `/admin/test`);

    const [, fetchInit] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const headers = fetchInit.headers as Headers;

    expect(headers.get(`authorization`)).toBe(`Bearer token`);
    expect(headers.get(`origin`)).toBe(TEST_ORIGIN);
    expect(headers.get(`x-remoola-test`)).toBe(`safe`);
    expect(headers.get(`x-forwarded-for`)).toBeNull();
  });

  it(`preserves multiple set-cookie headers from backend response`, async () => {
    const upstream = new Response(`ok`, { status: 200, headers: { 'content-type': `application/json` } });
    (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie = () => [
      `a=1; Path=/; HttpOnly`,
      `b=2; Path=/; HttpOnly`,
    ];
    (global.fetch as jest.Mock).mockResolvedValue(upstream);

    const req = new Request(`${TEST_ORIGIN}/api/admin/test`, { method: `GET` });
    const res = await proxyToBackend(req as never, `/admin/test`);

    const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    if (typeof getSetCookie === `function`) {
      expect(getSetCookie.call(res.headers)).toEqual([`a=1; Path=/; HttpOnly`, `b=2; Path=/; HttpOnly`]);
      return;
    }
    expect(res.headers.get(`set-cookie`)).toContain(`a=1`);
    expect(res.headers.get(`set-cookie`)).toContain(`b=2`);
  });
});
