import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { z } from 'zod';

const mockCookies = jest.fn<() => Promise<{ toString: () => string }>>();
const mockRedirect = jest.fn<(path: string) => never>();

jest.mock(`next/headers`, () => ({
  cookies: () => mockCookies(),
}));

jest.mock(`next/navigation`, () => ({
  redirect: (path: string) => mockRedirect(path),
}));

type MockFetch = jest.MockedFunction<typeof fetch>;

async function loadSubject() {
  return import(`./core.server`);
}

describe(`fetchAdminApiResult`, () => {
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
    mockCookies.mockReset();
    mockCookies.mockResolvedValue({ toString: () => `admin_access=token; admin_csrf_token=csrf` });
    mockRedirect.mockReset();
    mockRedirect.mockImplementation((path) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it(`returns ready data when upstream JSON matches the schema`, async () => {
    const { fetchAdminApiResult } = await loadSubject();
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: `admin-1`, count: 2 }), {
        status: 200,
        headers: { 'content-type': `application/json` },
      }),
    );

    const result = await fetchAdminApiResult(`/admin-v2/overview`, z.object({ id: z.string(), count: z.number() }));

    expect(result).toEqual({ status: `ready`, data: { id: `admin-1`, count: 2 } });
    expect(mockFetch).toHaveBeenCalledWith(`https://api.example.com/admin-v2/overview`, {
      method: `GET`,
      headers: {
        Cookie: `admin_access=token; admin_csrf_token=csrf`,
        origin: `https://admin-v2.example.com`,
      },
      cache: `no-store`,
      signal: expect.any(AbortSignal),
    });
  });

  it(`returns forbidden for 403 responses`, async () => {
    const { fetchAdminApiResult } = await loadSubject();
    mockFetch.mockResolvedValueOnce(new Response(`forbidden`, { status: 403 }));

    await expect(fetchAdminApiResult(`/admin-v2/consumers`, z.object({}))).resolves.toEqual({ status: `forbidden` });
  });

  it(`returns not_found for 404 responses`, async () => {
    const { fetchAdminApiResult } = await loadSubject();
    mockFetch.mockResolvedValueOnce(new Response(`missing`, { status: 404 }));

    await expect(fetchAdminApiResult(`/admin-v2/consumers/missing`, z.object({}))).resolves.toEqual({
      status: `not_found`,
    });
  });

  it(`returns error for upstream schema mismatches`, async () => {
    const { fetchAdminApiResult } = await loadSubject();
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 123 }), {
        status: 200,
        headers: { 'content-type': `application/json` },
      }),
    );

    await expect(fetchAdminApiResult(`/admin-v2/me`, z.object({ id: z.string() }))).resolves.toEqual({
      status: `error`,
    });
  });

  it(`returns error for network failures and non-ok responses`, async () => {
    const { fetchAdminApiResult } = await loadSubject();
    mockFetch.mockRejectedValueOnce(new Error(`socket hang up`));
    await expect(fetchAdminApiResult(`/admin-v2/me`, z.object({}))).resolves.toEqual({ status: `error` });

    mockFetch.mockResolvedValueOnce(new Response(`boom`, { status: 500 }));
    await expect(fetchAdminApiResult(`/admin-v2/me`, z.object({}))).resolves.toEqual({ status: `error` });
  });

  it(`redirects to login on 401 responses`, async () => {
    const { fetchAdminApiResult } = await loadSubject();
    mockFetch.mockResolvedValueOnce(new Response(`unauthorized`, { status: 401 }));

    await expect(fetchAdminApiResult(`/admin-v2/me`, z.object({}))).rejects.toThrow(
      `NEXT_REDIRECT:/login?sessionExpired=1`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(`/login?sessionExpired=1`);
  });

  it(`returns null from fetchAdminApi when the read result is not ready`, async () => {
    const { fetchAdminApi } = await loadSubject();
    mockFetch.mockResolvedValueOnce(new Response(`missing`, { status: 404 }));

    await expect(fetchAdminApi(`/admin-v2/overview`, z.object({ id: z.string() }))).resolves.toBeNull();
  });
});
