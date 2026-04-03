import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { getConsumerMobileCsrfTokenCookieKey } from '@remoola/api-types';

import { fetchWithAuth, swrConfig, swrFetcher } from './client';
import { resetSessionExpiredHandled } from './session-expired';

type MockFetch = jest.MockedFunction<typeof fetch>;

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { [`content-type`]: `application/json` },
  });
}

let lastReplaceUrl = ``;

function mockLocation(pathname: string): void {
  lastReplaceUrl = ``;
  const fakeLocation = {
    pathname,
    href: ``,
    replace: (url: string) => {
      lastReplaceUrl = url;
    },
  } as unknown as Location;
  (globalThis as { window?: { location: Location } }).window = {
    location: fakeLocation,
  };
}

describe(`client auth helpers`, () => {
  const originalFetch = global.fetch;
  const originalDocument = global.document;
  let mockFetch: MockFetch;
  const csrfCookieKey = getConsumerMobileCsrfTokenCookieKey({
    isProduction: false,
    isVercel: false,
    cookieSecure: false,
    isSecureRequest: false,
  });

  beforeEach(() => {
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
    Object.defineProperty(globalThis, `document`, {
      value: { cookie: `${csrfCookieKey}=csrf-cookie-value` },
      configurable: true,
      writable: true,
    });
    mockLocation(`/dashboard`);
    resetSessionExpiredHandled();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(globalThis, `document`, {
      value: originalDocument,
      configurable: true,
      writable: true,
    });
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
    // handleSessionExpired fetches /api/consumer/auth/clear-cookies before redirecting
    mockFetch.mockResolvedValueOnce(new Response(`{}`, { status: 200 }));

    await expect(swrFetcher(`/api/profile`)).rejects.toThrow(`Session expired`);
    // Wait for the async cookie-clear fetch + replace() call to settle
    await new Promise((r) => setTimeout(r, 10));
    expect(lastReplaceUrl).toContain(`/login?session_expired=1`);
  });

  it(`fetchWithAuth returns error object when refresh fails`, async () => {
    mockLocation(`/settings`);
    mockFetch.mockResolvedValueOnce(new Response(`Unauthorized`, { status: 401 }));
    mockFetch.mockResolvedValueOnce(new Response(`Unauthorized`, { status: 401 }));
    // handleSessionExpired fetches /api/consumer/auth/clear-cookies before redirecting
    mockFetch.mockResolvedValueOnce(new Response(`{}`, { status: 200 }));

    const result = await fetchWithAuth(`/api/settings`, { method: `POST` });

    expect(result).toEqual({ ok: false, error: `Session expired`, status: 401 });
    await new Promise((r) => setTimeout(r, 10));
    expect(lastReplaceUrl).toContain(`next=%2Fsettings`);
  });

  it(`fetchWithAuth attaches csrf on the first mutation request`, async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ ok: true }, 200));

    await fetchWithAuth(`/api/settings`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({ theme: `dark` }),
    });

    const headers = mockFetch.mock.calls[0]?.[1]?.headers as Headers | undefined;
    expect(headers?.get(`x-csrf-token`)).toBe(`csrf-cookie-value`);
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
