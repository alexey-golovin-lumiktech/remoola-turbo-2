import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { fetchWithAuth, swrConfig, swrFetcher } from './client';

type MockFetch = jest.MockedFunction<typeof fetch>;

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { [`content-type`]: `application/json` },
  });
}

function mockLocation(pathname: string): void {
  const fakeLocation = { pathname, href: `` } as unknown as Location;
  (globalThis as { window?: { location: Location } }).window = {
    location: fakeLocation,
  };
}

describe(`client auth helpers`, () => {
  const originalFetch = global.fetch;
  let mockFetch: MockFetch;

  beforeEach(() => {
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
    mockLocation(`/dashboard`);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it(`swrFetcher refreshes once on 401`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`Unauthorized`, { status: 401 }));
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ ok: true }, 200));
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ id: 1 }, 200));

    const data = await swrFetcher<{ id: number }>(`/api/profile`);

    expect(data.id).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `/api/consumer/auth/refresh`,
      expect.objectContaining({ method: `POST`, credentials: `include` }),
    );
  });

  it(`swrFetcher redirects when refresh fails`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`Unauthorized`, { status: 401 }));
    mockFetch.mockResolvedValueOnce(new Response(`Unauthorized`, { status: 401 }));

    await expect(swrFetcher(`/api/profile`)).rejects.toThrow(`Session expired`);
    const win = (globalThis as { window?: { location: Location } }).window;
    expect(win?.location.href).toContain(`/login?session_expired=true`);
  });

  it(`fetchWithAuth returns error object when refresh fails`, async () => {
    mockLocation(`/settings`);
    mockFetch.mockResolvedValueOnce(new Response(`Unauthorized`, { status: 401 }));
    mockFetch.mockResolvedValueOnce(new Response(`Unauthorized`, { status: 401 }));

    const result = await fetchWithAuth(`/api/settings`, { method: `POST` });

    expect(result).toEqual({ ok: false, error: `Session expired`, status: 401 });
    const win = (globalThis as { window?: { location: Location } }).window;
    expect(win?.location.href).toContain(`next=%2Fsettings`);
  });

  it(`fetchWithAuth returns error when response is not JSON`, async () => {
    mockFetch.mockResolvedValueOnce(new Response(`not json`, { status: 200 }));

    const result = await fetchWithAuth(`/api/settings`, { method: `GET` });

    expect(result).toEqual({ ok: false, error: `Invalid response (not JSON)`, status: 200 });
  });
});

describe(`swrConfig`, () => {
  it(`shouldRetryOnError handles status classes`, () => {
    if (typeof swrConfig.shouldRetryOnError !== `function`) {
      throw new Error(`Expected shouldRetryOnError to be a function`);
    }
    expect(swrConfig.shouldRetryOnError({ status: 401 })).toBe(false);
    expect(swrConfig.shouldRetryOnError({ status: 404 })).toBe(false);
    expect(swrConfig.shouldRetryOnError({ status: 500 })).toBe(true);
  });
});
