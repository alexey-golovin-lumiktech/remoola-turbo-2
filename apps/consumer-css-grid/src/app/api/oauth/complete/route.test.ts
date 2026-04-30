import { afterEach, describe, expect, it, jest } from '@jest/globals';

const mockGetEnv = jest.fn();

jest.mock(`../../../../lib/env.server`, () => ({
  getEnv: (...args: unknown[]) => mockGetEnv(...args),
}));

import { CURRENT_CONSUMER_APP_SCOPE, getApiV2ConsumerCsrfTokenCookieKeyForRuntime } from '@remoola/api-types';

import { POST } from './route';
import { getSetCookieValues } from '../../../../lib/api-utils';

describe(`consumer-css-grid oauth complete route`, () => {
  const cssGridCsrfCookieKey = getApiV2ConsumerCsrfTokenCookieKeyForRuntime({
    isProduction: false,
    isVercel: false,
    cookieSecure: false,
    isSecureRequest: false,
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it(`forwards oauth completion with origin and inferred csrf`, async () => {
    mockGetEnv.mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` });
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
    mockGetEnv.mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` });
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
