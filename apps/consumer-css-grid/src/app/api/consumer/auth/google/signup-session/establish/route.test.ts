import { afterEach, describe, expect, it, jest } from '@jest/globals';

const mockGetEnv = jest.fn();

jest.mock(`../../../../../../../lib/env.server`, () => ({
  getEnv: (...args: unknown[]) => mockGetEnv(...args),
}));

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { POST } from './route';
import { getSetCookieValues } from '../../../../../../../lib/api-utils';

describe(`consumer-css-grid google signup-session establish route`, () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it(`proxies establish to api-v2 with the canonical app scope`, async () => {
    mockGetEnv.mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` });
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
    expect(forwardedUrl).toContain(`/consumer/auth/google/signup-session/establish`);
    expect(forwardedUrl).toContain(`appScope=${CURRENT_CONSUMER_APP_SCOPE}`);
    expect(getSetCookieValues(res.headers).some((c) => c.startsWith(`google_signup_session=`))).toBe(true);
  });
});
