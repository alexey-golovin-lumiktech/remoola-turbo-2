import { Test, type TestingModule } from '@nestjs/testing';

import { OriginResolverService } from './origin-resolver.service';
import { envs } from '../envs';

jest.mock(`../envs`, () => ({
  envs: {
    NODE_ENV: `test`,
    ENVIRONMENT: {
      PRODUCTION: `production`,
      STAGING: `staging`,
      DEVELOPMENT: `development`,
      TEST: `test`,
    },
    CONSUMER_APP_ORIGIN: `https://consumer.example.com`,
    CONSUMER_MOBILE_APP_ORIGIN: `https://mobile.example.com`,
    CONSUMER_CSS_GRID_APP_ORIGIN: `https://grid.example.com`,
    ADMIN_APP_ORIGIN: `https://admin.example.com`,
    CORS_ALLOWED_ORIGINS: [`https://allowed1.example.com`, `https://allowed2.example.com`],
  },
}));

describe(`OriginResolverService`, () => {
  let service: OriginResolverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OriginResolverService],
    }).compile();

    service = module.get<OriginResolverService>(OriginResolverService);
  });

  it(`should be defined`, () => {
    expect(service).toBeDefined();
  });

  describe(`normalizeOrigin`, () => {
    it(`should remove trailing slash`, () => {
      expect(service.normalizeOrigin(`https://example.com/`)).toBe(`https://example.com`);
    });

    it(`should not modify origin without trailing slash`, () => {
      expect(service.normalizeOrigin(`https://example.com`)).toBe(`https://example.com`);
    });

    it(`should handle multiple trailing slashes`, () => {
      expect(service.normalizeOrigin(`https://example.com///`)).toBe(`https://example.com//`);
    });
  });

  describe(`getAllowedOrigins`, () => {
    it(`should return all configured origins`, () => {
      const origins = service.getAllowedOrigins();

      expect(origins.size).toBeGreaterThan(0);
      expect(origins.has(`https://consumer.example.com`)).toBe(true);
      expect(origins.has(`https://mobile.example.com`)).toBe(true);
      expect(origins.has(`https://grid.example.com`)).toBe(true);
      expect(origins.has(`https://admin.example.com`)).toBe(true);
    });

    it(`should normalize origins in the set`, () => {
      const origins = service.getAllowedOrigins();

      expect(origins.has(`https://consumer.example.com/`)).toBe(false);
      expect(origins.has(`https://consumer.example.com`)).toBe(true);
    });
  });

  describe(`validateRedirectOrigin`, () => {
    let originalEnvs: typeof envs;

    beforeEach(() => {
      originalEnvs = { ...envs };
    });

    afterEach(() => {
      Object.assign(envs, originalEnvs);
    });

    it(`should return undefined for undefined input`, () => {
      expect(service.validateRedirectOrigin(undefined)).toBeUndefined();
    });

    it(`should return undefined for invalid URL`, () => {
      expect(service.validateRedirectOrigin(`not-a-url`)).toBeUndefined();
    });

    it(`should return normalized origin for allowed origin`, () => {
      const result = service.validateRedirectOrigin(`https://consumer.example.com/path`);
      expect(result).toBe(`https://consumer.example.com`);
    });

    it(`should return undefined for disallowed origin`, () => {
      const result = service.validateRedirectOrigin(`https://evil.example.com/path`);
      expect(result).toBeUndefined();
    });

    it(`should handle trailing slashes`, () => {
      const result = service.validateRedirectOrigin(`https://consumer.example.com/`);
      expect(result).toBe(`https://consumer.example.com`);
    });

    it(`should allow localhost consumer origin in development when allowlist is narrowed`, () => {
      (envs as any).NODE_ENV = `development`;
      (envs as any).CORS_ALLOWED_ORIGINS = [`https://allowed1.example.com`];

      const result = service.validateRedirectOrigin(`http://127.0.0.1:3001/path`);
      expect(result).toBe(`http://127.0.0.1:3001`);
    });

    it(`should reject localhost consumer origin in production when not allowlisted`, () => {
      (envs as any).NODE_ENV = `production`;
      (envs as any).CORS_ALLOWED_ORIGINS = [`https://allowed1.example.com`];

      const result = service.validateRedirectOrigin(`http://127.0.0.1:3001/path`);
      expect(result).toBeUndefined();
    });
  });

  describe(`resolveConsumerRedirectOrigin`, () => {
    it(`should return validated redirectOrigin if provided`, () => {
      const result = service.resolveConsumerRedirectOrigin(`https://consumer.example.com/some/path`);
      expect(result).toBe(`https://consumer.example.com`);
    });

    it(`should fallback to CONSUMER_APP_ORIGIN`, () => {
      const result = service.resolveConsumerRedirectOrigin();
      expect(result).toBe(`https://consumer.example.com`);
    });

    it(`should ignore invalid redirectOrigin and use fallback`, () => {
      const result = service.resolveConsumerRedirectOrigin(`https://evil.example.com`);
      expect(result).toBe(`https://consumer.example.com`);
    });
  });

  describe(`resolveConsumerAppScope`, () => {
    it(`maps configured consumer web origin`, () => {
      expect(service.resolveConsumerAppScope(`https://consumer.example.com/dashboard`)).toBe(`consumer`);
    });

    it(`maps configured consumer mobile origin`, () => {
      expect(service.resolveConsumerAppScope(`https://mobile.example.com/settings`)).toBe(`consumer-mobile`);
    });

    it(`maps configured consumer css-grid origin`, () => {
      expect(service.resolveConsumerAppScope(`https://grid.example.com/payments`)).toBe(`consumer-css-grid`);
    });

    it(`maps local dev ports to the matching scope`, () => {
      (envs as any).NODE_ENV = `development`;

      expect(service.resolveConsumerAppScope(`http://localhost:3001/foo`)).toBe(`consumer`);
      expect(service.resolveConsumerAppScope(`http://localhost:3002/foo`)).toBe(`consumer-mobile`);
      expect(service.resolveConsumerAppScope(`http://localhost:3003/foo`)).toBe(`consumer-css-grid`);
    });
  });

  describe(`resolveRequestOrigin`, () => {
    it(`should prefer a valid origin header`, () => {
      const result = service.resolveRequestOrigin(
        `https://consumer.example.com/payments/123`,
        `https://allowed1.example.com/dashboard`,
      );

      expect(result).toBe(`https://consumer.example.com`);
    });

    it(`should fallback to referer when origin header is invalid`, () => {
      const result = service.resolveRequestOrigin(
        `https://evil.example.com/path`,
        `https://consumer.example.com/reset`,
      );

      expect(result).toBe(`https://consumer.example.com`);
    });

    it(`should support multi-value headers`, () => {
      const result = service.resolveRequestOrigin([``, `https://consumer.example.com/settings`], undefined);

      expect(result).toBe(`https://consumer.example.com`);
    });
  });

  describe(`resolveConsumerRequestAppScope`, () => {
    it(`prefers the origin header when it maps to a consumer scope`, () => {
      const result = service.resolveConsumerRequestAppScope(
        `https://mobile.example.com/profile`,
        `https://consumer.example.com/login`,
      );

      expect(result).toBe(`consumer-mobile`);
    });

    it(`falls back to referer when origin is invalid`, () => {
      const result = service.resolveConsumerRequestAppScope(
        `https://evil.example.com/`,
        `https://grid.example.com/exchange`,
      );

      expect(result).toBe(`consumer-css-grid`);
    });
  });

  describe(`resolveConsumerOriginFromRequest`, () => {
    it(`should prefer explicit redirectOrigin over request headers`, () => {
      const result = service.resolveConsumerOriginFromRequest(
        `https://consumer.example.com/path`,
        `https://consumer.example.com/payments/123`,
        `https://admin.example.com/dashboard`,
      );

      expect(result).toBe(`https://consumer.example.com`);
    });

    it(`should fallback to request headers before env defaults`, () => {
      const result = service.resolveConsumerOriginFromRequest(
        undefined,
        undefined,
        `https://consumer.example.com/forgot`,
      );

      expect(result).toBe(`https://consumer.example.com`);
    });
  });

  describe(`resolveConsumerRedirectOrigin - with placeholder values`, () => {
    let originalEnvs: typeof envs;

    beforeEach(() => {
      originalEnvs = { ...envs };
    });

    afterEach(() => {
      Object.assign(envs, originalEnvs);
    });

    it(`should fallback to CONSUMER_MOBILE_APP_ORIGIN when CONSUMER_APP_ORIGIN is placeholder`, () => {
      (envs as any).CONSUMER_APP_ORIGIN = `CONSUMER_APP_ORIGIN`;
      (envs as any).CONSUMER_MOBILE_APP_ORIGIN = `https://mobile.example.com`;

      const result = service.resolveConsumerRedirectOrigin();
      expect(result).toBe(`https://mobile.example.com`);
    });

    it(`should fallback to CONSUMER_CSS_GRID_APP_ORIGIN when web and mobile origins are placeholders`, () => {
      (envs as any).CONSUMER_APP_ORIGIN = `CONSUMER_APP_ORIGIN`;
      (envs as any).CONSUMER_MOBILE_APP_ORIGIN = `CONSUMER_MOBILE_APP_ORIGIN`;
      (envs as any).CONSUMER_CSS_GRID_APP_ORIGIN = `https://grid.example.com`;

      const result = service.resolveConsumerRedirectOrigin();
      expect(result).toBe(`https://grid.example.com`);
    });

    it(`should return null when no valid consumer origins are available`, () => {
      (envs as any).CONSUMER_APP_ORIGIN = `CONSUMER_APP_ORIGIN`;
      (envs as any).CONSUMER_MOBILE_APP_ORIGIN = `CONSUMER_MOBILE_APP_ORIGIN`;
      (envs as any).CONSUMER_CSS_GRID_APP_ORIGIN = `CONSUMER_CSS_GRID_APP_ORIGIN`;
      (envs as any).CORS_ALLOWED_ORIGINS = [];

      const result = service.resolveConsumerRedirectOrigin();
      expect(result).toBeNull();
    });
  });
});
