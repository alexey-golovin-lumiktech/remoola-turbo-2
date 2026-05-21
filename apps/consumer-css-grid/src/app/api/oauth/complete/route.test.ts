import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { CURRENT_CONSUMER_APP_SCOPE, getApiV2ConsumerCsrfTokenCookieKeyForRuntime } from '@remoola/api-types';

import { getSetCookieValues } from '../../../../lib/api-utils';

const API_BASE_URL = `https://api.example.com`;
const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

async function loadSubject() {
  return import(`./route`);
}

describe(`consumer-css-grid oauth complete route`, () => {
  const cssGridCsrfCookieKey = getApiV2ConsumerCsrfTokenCookieKeyForRuntime({
    isProduction: false,
    isVercel: false,
    cookieSecure: false,
    isSecureRequest: false,
  });

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = API_BASE_URL;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalApiBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    }
  });

  it(`forwards oauth completion with origin and inferred csrf`, async () => {
    const { POST } = await loadSubject();
    const fetchSpy = jest.spyOn(global, `fetch`).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, next: `/dashboard` }), {
        status: 200,
        headers: { [`set-cookie`]: `oauth_cookie=ok; Path=/; HttpOnly` },
      }),
    );

    const req = new Request(`https://grid.example.com/api/oauth/complete`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        cookie: `consumer_session=session-cookie; ${cssGridCsrfCookieKey}=csrf-cookie`,
        origin: `https://grid.example.com`,
      },
      body: JSON.stringify({ handoffToken: `handoff-123` }),
    });

    const res = await POST(req);
    const forwardedHeaders = fetchSpy.mock.calls[0]?.[1]?.headers as Headers | undefined;

    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(
      `/consumer/auth/oauth/complete?appScope=${CURRENT_CONSUMER_APP_SCOPE}`,
    );
    expect(forwardedHeaders?.get(`origin`)).toBe(`https://grid.example.com`);
    expect(forwardedHeaders?.get(`x-csrf-token`)).toBe(`csrf-cookie`);
    expect(getSetCookieValues(res.headers).some((cookie) => cookie.startsWith(`oauth_cookie=`))).toBe(true);
  });

  it(`rejects invalid json before proxying oauth completion`, async () => {
    const { POST } = await loadSubject();
    const fetchSpy = jest.spyOn(global, `fetch`);

    const req = new Request(`https://grid.example.com/api/oauth/complete`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
      },
      body: `{invalid-json`,
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
