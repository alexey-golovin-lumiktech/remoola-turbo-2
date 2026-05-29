import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { getSetCookieValues } from '../../../../../../../lib/api-utils';

const API_BASE_URL = `https://api.example.com`;
const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

async function loadSubject() {
  return import(`./route`);
}

describe(`consumer-css-grid google signup-session establish route`, () => {
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

  it(`proxies establish to api-v2 with the canonical app scope`, async () => {
    const { POST } = await loadSubject();
    const fetchSpy = jest.spyOn(global, `fetch`).mockResolvedValueOnce(
      new Response(JSON.stringify({ email: `g@example.com`, givenName: `Ada` }), {
        status: 200,
        headers: { [`set-cookie`]: `google_signup_session=ok; Path=/; HttpOnly` },
      }),
    );

    const req = new Request(`https://grid.example.com/api/consumer/auth/google/signup-session/establish`, {
      method: `POST`,
      headers: { 'content-type': `application/json`, origin: `https://grid.example.com` },
      body: JSON.stringify({ handoffToken: `handoff-abc` }),
    });

    const res = await POST(req);
    const forwardedUrl = String(fetchSpy.mock.calls[0]?.[0]);

    expect(res.status).toBe(200);
    expect(forwardedUrl).toContain(`/api/consumer/auth/google/signup-session/establish`);
    expect(forwardedUrl).toContain(`appScope=${CURRENT_CONSUMER_APP_SCOPE}`);
    expect(getSetCookieValues(res.headers).some((c) => c.startsWith(`google_signup_session=`))).toBe(true);
  });
});
