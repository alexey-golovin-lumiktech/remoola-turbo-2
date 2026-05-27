import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { z } from 'zod';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`admin-v2 proxy helpers`, () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;
  let mockFetch: MockFetch;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_API_BASE_URL: `https://api.example.com`,
      ADMIN_V2_APP_ORIGIN: `https://admin-v2.example.com`,
    };
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it(`returns a config error when the API base URL is missing`, async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    const { proxyAdminApiRoute } = await import(`./api-utils`);

    const response = await proxyAdminApiRoute({
      req: new Request(`https://admin-v2.example.com/api/me`),
      method: `GET`,
      upstreamPath: `/admin-v2/me`,
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: `API base URL not configured`,
      code: `CONFIG_ERROR`,
    });
  });

  it(`rejects malformed JSON bodies`, async () => {
    const { requireJsonBody } = await import(`./api-utils`);

    const result = await requireJsonBody(
      new Request(`https://admin-v2.example.com/api/admin-v2/auth/password/reset`, {
        method: `POST`,
        body: `{broken`,
        headers: { 'content-type': `application/json` },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error(`Expected invalid JSON response`);
    }
    expect(result.response.status).toBe(400);
    await expect(result.response.json()).resolves.toEqual({
      code: `INVALID_JSON`,
      message: `Request body must be valid JSON`,
    });
  });

  it(`validates JSON bodies with Zod and returns field errors`, async () => {
    const { requireValidatedJsonBody } = await import(`./api-utils`);

    const result = await requireValidatedJsonBody(
      new Request(`https://admin-v2.example.com/api/admin-v2/auth/login`, {
        method: `POST`,
        body: JSON.stringify({ email: `ops@example.com` }),
        headers: { 'content-type': `application/json` },
      }),
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
      }),
      { code: `VALIDATION_ERROR`, message: `Invalid login payload` },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error(`Expected validation error`);
    }
    expect(result.response.status).toBe(400);
    await expect(result.response.json()).resolves.toMatchObject({
      code: `VALIDATION_ERROR`,
      message: `Invalid login payload`,
      fieldErrors: { password: expect.any(Array) },
    });
  });

  it(`proxies validated JSON payloads and forwards set-cookie headers`, async () => {
    const { proxyAdminApiRoute, requireValidatedJsonBody, buildAuthMutationForwardHeaders } = await import(
      `./api-utils`
    );

    mockFetch.mockResolvedValueOnce(
      new Response(`{"ok":true}`, {
        status: 200,
        headers: {
          'set-cookie': `admin_access=new-token; Path=/; HttpOnly`,
        },
      }),
    );

    const response = await proxyAdminApiRoute({
      req: new Request(`https://admin-v2.example.com/api/admin-v2/auth/login`, {
        method: `POST`,
        body: JSON.stringify({ email: `ops@example.com`, password: `Current1!@#abc` }),
        headers: {
          'content-type': `application/json`,
          cookie: `admin_refresh=refresh-token`,
        },
      }),
      method: `POST`,
      upstreamPath: `/admin-v2/auth/login`,
      buildHeaders: buildAuthMutationForwardHeaders,
      prepareBody: (req) =>
        requireValidatedJsonBody(
          req,
          z.object({
            email: z.string().email(),
            password: z.string().min(8),
          }),
          { code: `VALIDATION_ERROR`, message: `Invalid login payload` },
        ),
    });

    expect(mockFetch).toHaveBeenCalledWith(new URL(`https://api.example.com/admin-v2/auth/login`), {
      method: `POST`,
      headers: expect.any(Headers),
      body: JSON.stringify({ email: `ops@example.com`, password: `Current1!@#abc` }),
      cache: `no-store`,
      signal: expect.any(AbortSignal),
    });
    const headers = mockFetch.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get(`cookie`)).toBe(`admin_refresh=refresh-token`);
    expect(headers.get(`origin`)).toBe(`https://admin-v2.example.com`);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(`{"ok":true}`);
    expect(response.headers.get(`set-cookie`)).toContain(`admin_access=new-token`);
  });

  it(`passes through upstream text bodies for raw JSON routes`, async () => {
    const { proxyAdminApiRoute, requireJsonBody, buildAuthMutationForwardHeaders } = await import(`./api-utils`);

    mockFetch.mockResolvedValueOnce(new Response(`accepted`, { status: 202 }));

    const response = await proxyAdminApiRoute({
      req: new Request(`https://admin-v2.example.com/api/admin-v2/auth/invitations/accept`, {
        method: `POST`,
        body: JSON.stringify({ token: `invite-token`, password: `Current1!@#abc` }),
        headers: { 'content-type': `application/json` },
      }),
      method: `POST`,
      upstreamPath: `/admin-v2/auth/invitations/accept`,
      buildHeaders: buildAuthMutationForwardHeaders,
      prepareBody: requireJsonBody,
    });

    expect(response.status).toBe(202);
    await expect(response.text()).resolves.toBe(`accepted`);
  });

  it(`supports no-body proxy requests`, async () => {
    const { proxyAdminApiRoute, buildAuthMutationForwardHeaders } = await import(`./api-utils`);

    mockFetch.mockResolvedValueOnce(new Response(`rotated`, { status: 200 }));

    const response = await proxyAdminApiRoute({
      req: new Request(`https://admin-v2.example.com/api/admin-v2/auth/refresh-access`, {
        method: `POST`,
        headers: { cookie: `admin_refresh=refresh-token` },
      }),
      method: `POST`,
      upstreamPath: `/admin-v2/auth/refresh-access`,
      buildHeaders: buildAuthMutationForwardHeaders,
    });

    expect(mockFetch.mock.calls[0]?.[1]?.body).toBeUndefined();
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(`rotated`);
  });

  it(`returns a generic network error when the upstream fetch rejects`, async () => {
    const { proxyAdminApiRoute } = await import(`./api-utils`);

    mockFetch.mockRejectedValueOnce(new Error(`socket hang up`));

    const response = await proxyAdminApiRoute({
      req: new Request(`https://admin-v2.example.com/api/admin-v2/auth/me`),
      method: `GET`,
      upstreamPath: `/admin-v2/auth/me`,
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: `NETWORK_ERROR`,
      message: `The upstream API request failed. Please try again.`,
    });
  });
});
