import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { getConsumerCsrfTokenCookieKey } from '@remoola/api-types';

import { ApiClient } from './api';

type MockFetch = jest.MockedFunction<typeof fetch>;

describe(`consumer api client`, () => {
  const originalFetch = global.fetch;
  const originalDocument = global.document;
  let mockFetch: MockFetch;
  const csrfCookieKey = getConsumerCsrfTokenCookieKey({
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
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(globalThis, `document`, {
      value: originalDocument,
      configurable: true,
      writable: true,
    });
  });

  it(`attaches csrf header on the first mutation request`, async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { [`content-type`]: `application/json` },
      }),
    );

    const client = new ApiClient();
    const result = await client.post(`/api/profile/update`, { firstName: `Aleksey` });
    const headers = mockFetch.mock.calls[0]?.[1]?.headers as Record<string, string> | undefined;

    expect(result).toEqual({ ok: true, data: { ok: true } });
    expect(headers?.[`x-csrf-token`]).toBe(`csrf-cookie-value`);
  });
});
