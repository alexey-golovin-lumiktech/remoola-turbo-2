import { COOKIE_KEYS } from '@remoola/api-types';

jest.mock(`../shared/origin-resolver.service`, () => ({
  OriginResolverService: class {
    resolveConsumerRequestAppScope(
      origin?: string | string[],
      referer?: string | string[],
    ): `consumer` | `consumer-mobile` | `consumer-css-grid` | undefined {
      const values = [origin, referer].flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
      for (const entry of values) {
        if (typeof entry !== `string`) continue;
        if (entry.includes(`mobile.example.com`)) return `consumer-mobile`;
        if (entry.includes(`grid.example.com`)) return `consumer-css-grid`;
        if (entry.includes(`app.example.com`) || entry.includes(`consumer.example.com`)) return `consumer`;
      }
      return undefined;
    }
  },
}));

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
        authorization: `legacy-token`,
      },
    });

    expect(token).toBe(`consumer-token`);
  });

  it(`extracts the mobile consumer cookie token when trusted origin maps to mobile scope`, () => {
    const mobileKey = getApiConsumerAccessTokenCookieKeysForRead(`consumer-mobile`)[0];
    const token = extractToken({
      path: `/api/consumer/dashboard`,
      cookies: {
        [mobileKey]: `mobile-token`,
      },
      headers: {
        origin: `https://mobile.example.com`,
      },
    });

    expect(token).toBe(`mobile-token`);
  });

  it(`extracts the css-grid consumer cookie token when trusted origin maps to css-grid scope`, () => {
    const gridKey = getApiConsumerAccessTokenCookieKeysForRead(`consumer-css-grid`)[0];
    const token = extractToken({
      path: `/api/consumer/dashboard`,
      cookies: {
        [gridKey]: `grid-token`,
      },
      headers: {
        origin: `https://grid.example.com`,
      },
    });

    expect(token).toBe(`grid-token`);
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
