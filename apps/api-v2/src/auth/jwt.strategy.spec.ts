import {
  CONSUMER_APP_SCOPE_HEADER,
  COOKIE_KEYS,
  CURRENT_CONSUMER_APP_SCOPE,
  type ConsumerAppScope,
} from '@remoola/api-types';

jest.mock(`../shared/origin-resolver.service`, () => ({
  OriginResolverService: class {
    validateConsumerAppScopeHeader(value?: string | string[]): ConsumerAppScope | undefined {
      const { CURRENT_CONSUMER_APP_SCOPE: canonicalScope } = jest.requireActual(`@remoola/api-types`) as {
        CURRENT_CONSUMER_APP_SCOPE: ConsumerAppScope;
      };
      const headerValue = Array.isArray(value) ? value[0] : value;
      return headerValue === canonicalScope ? canonicalScope : undefined;
    }
  },
}));

import { JwtStrategy } from './jwt.strategy';
import { OriginResolverService } from '../shared/origin-resolver.service';
import { getApiConsumerAccessTokenCookieKeysForRead } from '../shared-common';

describe(`JwtStrategy`, () => {
  const originResolver = new OriginResolverService();

  function extractToken(request: Record<string, unknown>): string | null {
    const strategy = new JwtStrategy(originResolver) as JwtStrategy & {
      _jwtFromRequest: (req: Record<string, unknown>) => string | null;
    };
    return strategy._jwtFromRequest(request);
  }

  function createStrategy(): JwtStrategy {
    return new JwtStrategy(originResolver);
  }

  it(`extracts the consumer cookie token for consumer API paths`, () => {
    const consumerKey = getApiConsumerAccessTokenCookieKeysForRead()[0];
    const token = extractToken({
      path: `/api/consumer/dashboard`,
      cookies: {
        [consumerKey]: `consumer-token`,
      },
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
        authorization: `legacy-token`,
      },
    });

    expect(token).toBe(`consumer-token`);
  });

  it(`does not extract a consumer cookie token without an explicit consumer app scope`, () => {
    const consumerKey = getApiConsumerAccessTokenCookieKeysForRead()[0];
    const token = extractToken({
      path: `/api/consumer/dashboard`,
      cookies: {
        [consumerKey]: `consumer-token`,
      },
      headers: {},
    });

    expect(token).toBeNull();
  });

  it(`rejects invalid consumer app scope headers`, () => {
    const mobileKey = getApiConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE)[0];
    const token = extractToken({
      path: `/api/consumer/dashboard`,
      cookies: {
        [mobileKey]: `mobile-token`,
      },
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: `unknown-scope`,
      },
    });

    expect(token).toBeNull();
  });

  it(`extracts the css-grid consumer cookie token when app scope header selects css-grid scope`, () => {
    const gridKey = getApiConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE)[0];
    const token = extractToken({
      path: `/api/consumer/dashboard`,
      cookies: {
        [gridKey]: `grid-token`,
      },
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
      },
    });

    expect(token).toBe(`grid-token`);
  });

  it(`extracts the admin cookie token for admin API paths`, () => {
    const token = extractToken({
      path: `/api/admin-v2/auth/me`,
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
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
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
