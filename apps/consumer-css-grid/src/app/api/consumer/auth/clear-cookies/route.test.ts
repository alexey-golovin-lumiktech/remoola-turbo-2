import { describe, expect, it } from '@jest/globals';

import {
  getApiV2ConsumerAccessTokenCookieKeysForRead,
  getApiV2ConsumerCsrfTokenCookieKey,
  getApiV2ConsumerDeviceCookieKeysForRead,
  getApiV2ConsumerRefreshTokenCookieKeysForRead,
  getApiV2GoogleOAuthStateCookieKey,
} from '@remoola/api-types';

import { POST } from './route';
import { getSetCookieValues } from '../../../../../lib/api-utils';

describe(`clear cookies route`, () => {
  it(`returns ok and clears all consumer auth cookies`, async () => {
    const response = await POST(
      new Request(`https://app.example.com/api/consumer/auth/clear-cookies`, {
        method: `POST`,
      }),
    );

    const setCookies = getSetCookieValues(response.headers);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    for (const key of getApiV2ConsumerAccessTokenCookieKeysForRead()) {
      expect(setCookies.some((cookie) => cookie.startsWith(`${key}=`))).toBe(true);
    }
    for (const key of getApiV2ConsumerRefreshTokenCookieKeysForRead()) {
      expect(setCookies.some((cookie) => cookie.startsWith(`${key}=`))).toBe(true);
    }
    for (const key of getApiV2ConsumerDeviceCookieKeysForRead()) {
      expect(setCookies.some((cookie) => cookie.startsWith(`${key}=`))).toBe(true);
    }
    expect(setCookies.some((cookie) => cookie.startsWith(`${getApiV2ConsumerCsrfTokenCookieKey()}=`))).toBe(true);
    expect(setCookies.some((cookie) => cookie.startsWith(`${getApiV2GoogleOAuthStateCookieKey()}=`))).toBe(true);
  });
});
