import { describe, expect, it } from '@jest/globals';

import { AUTH_NOTICE_QUERY } from '@remoola/api-types';

import { parseSearchParams } from './schemas';

describe(`auth search params`, () => {
  it(`accepts duplicated session_expired params and uses the first value`, () => {
    expect(parseSearchParams({ session_expired: [`1`, `0`] }).sessionExpired).toBe(true);
    expect(parseSearchParams({ session_expired: [`0`, `1`] }).sessionExpired).toBe(false);
  });

  it(`sanitizes duplicated next params and auth notices without throwing`, () => {
    const parsed = parseSearchParams({
      next: [`/payments`, `https://evil.example.com`],
      [AUTH_NOTICE_QUERY]: [`reset_success`, `unknown`],
    });

    expect(parsed.nextPath).toBe(`/payments`);
    expect(parsed.authNotice).not.toBeNull();
  });
});
