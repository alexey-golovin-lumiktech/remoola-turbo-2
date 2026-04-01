import { COOKIE_KEYS } from '@remoola/api-types';

import { JwtStrategy } from './jwt.strategy';
import { getApiConsumerAccessTokenCookieKeysForRead } from '../shared-common';

describe(`JwtStrategy`, () => {
  function extractToken(request: Record<string, unknown>): string | null {
    const strategy = new JwtStrategy() as JwtStrategy & {
      _jwtFromRequest: (req: Record<string, unknown>) => string | null;
    };
    return strategy._jwtFromRequest(request);
  }

  function createStrategy(): JwtStrategy {
    return new JwtStrategy();
  }

  it(`extracts the consumer cookie token for consumer API paths`, () => {
    const consumerKey = getApiConsumerAccessTokenCookieKeysForRead()[0];
    const token = extractToken({
      path: `/api/consumer/dashboard`,
      cookies: {
        [consumerKey]: `consumer-token`,
      },
      headers: {
        authorization: `Bearer header-token`,
      },
    });

    expect(token).toBe(`consumer-token`);
  });

  it(`extracts the admin cookie token for admin API paths`, () => {
    const token = extractToken({
      path: `/api/admin/auth/me`,
      cookies: {
        [COOKIE_KEYS.ADMIN_ACCESS_TOKEN]: `admin-token`,
      },
    });

    expect(token).toBe(`admin-token`);
  });

  it(`does not widen auth to bearer headers without cookies`, () => {
    const token = extractToken({
      path: `/api/consumer/dashboard`,
      cookies: {},
      headers: {
        authorization: `Bearer header-token`,
      },
    });

    expect(token).toBeNull();
  });

  it(`accepts access payloads during validation`, () => {
    const strategy = createStrategy();

    expect(strategy.validate({ sub: `user-1`, email: `user@example.com`, typ: `access` })).toEqual({
      id: `user-1`,
      email: `user@example.com`,
    });
  });

  it(`rejects refresh payloads during validation`, () => {
    const strategy = createStrategy();

    expect(strategy.validate({ sub: `user-1`, email: `user@example.com`, typ: `refresh` })).toBeNull();
  });
});
