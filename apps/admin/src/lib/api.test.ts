import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { apiFetch } from './api';
import { getAdminCsrfCookieKey } from './auth-cookie-policy';

describe(`admin apiFetch csrf behavior`, () => {
  const originalFetch = global.fetch;
  const originalDocument = global.document;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': `application/json` },
        }),
    );
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.document = originalDocument;
  });

  it(`adds x-csrf-token for mutation requests when csrf cookie exists`, async () => {
    Object.defineProperty(global, `document`, {
      value: { cookie: `${getAdminCsrfCookieKey()}=csrf-123; other=value` },
      configurable: true,
      writable: true,
    });

    await apiFetch(`/api/auth/logout`, { method: `POST` });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/auth/logout`,
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get(`x-csrf-token`)).toBe(`csrf-123`);
  });

  it(`does not add x-csrf-token for GET requests`, async () => {
    Object.defineProperty(global, `document`, {
      value: { cookie: `${getAdminCsrfCookieKey()}=csrf-123` },
      configurable: true,
      writable: true,
    });

    await apiFetch(`/api/admins`, { method: `GET` });

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers[`x-csrf-token`]).toBeUndefined();
  });
});
