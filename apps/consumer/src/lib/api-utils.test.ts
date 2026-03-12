import { appendSetCookies, buildForwardHeaders, requireJsonBody } from './api-utils';

const TEST_ORIGIN = `http://localhost:3001`;

describe(`consumer api-utils`, () => {
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

  it(`buildForwardHeaders keeps allowlisted headers and drops untrusted ones`, () => {
    const headers = buildForwardHeaders(
      new Headers({
        authorization: `Bearer token`,
        origin: TEST_ORIGIN,
        cookie: `csrf_token=abc`,
        'x-correlation-id': `corr-1`,
        'x-remoola-feature': `on`,
        'x-forwarded-for': `10.0.0.1`,
      }),
    );

    expect(headers.get(`authorization`)).toBe(`Bearer token`);
    expect(headers.get(`origin`)).toBe(TEST_ORIGIN);
    expect(headers.get(`cookie`)).toBe(`csrf_token=abc`);
    expect(headers.get(`x-correlation-id`)).toBe(`corr-1`);
    expect(headers.get(`x-remoola-feature`)).toBe(`on`);
    expect(headers.get(`x-forwarded-for`)).toBeNull();
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
