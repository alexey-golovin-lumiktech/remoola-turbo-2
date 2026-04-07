import { CONSUMER_APP_SCOPE_HEADER, COOKIE_KEYS, resolveAccessTokenCookieKeysForPath } from '@remoola/api-types';

jest.mock(`../shared/origin-resolver.service`, () => ({
  OriginResolverService: class {
    validateConsumerAppScopeHeader(
      value?: string | string[],
    ): `consumer` | `consumer-mobile` | `consumer-css-grid` | undefined {
      const headerValue = Array.isArray(value) ? value[0] : value;
      if (headerValue === `consumer` || headerValue === `consumer-mobile` || headerValue === `consumer-css-grid`) {
        return headerValue;
      }
      return undefined;
    }
  },
}));

import { JwtStrategy } from './jwt.strategy';

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
    const consumerKey = resolveAccessTokenCookieKeysForPath(`/api/consumer/dashboard`)[0];
    const token = extractToken({
      path: `/api/consumer/dashboard`,
      cookies: {
        [consumerKey]: `consumer-token`,
      },
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: `consumer`,
        authorization: `legacy-token`,
      },
    });

    expect(token).toBe(`consumer-token`);
  });

  it(`does not extract a consumer cookie token without an explicit consumer app scope`, () => {
    const consumerKey = resolveAccessTokenCookieKeysForPath(`/api/consumer/dashboard`, `consumer`)[0];
    const token = extractToken({
      path: `/api/consumer/dashboard`,
      cookies: {
        [consumerKey]: `consumer-token`,
      },
      headers: {},
    });

    expect(token).toBeNull();
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

  it(`does not widen auth to authorization headers without cookies`, () => {
    const token = extractToken({
      path: `/api/consumer/dashboard`,
      cookies: {},
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: `consumer`,
        authorization: `legacy-token`,
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
