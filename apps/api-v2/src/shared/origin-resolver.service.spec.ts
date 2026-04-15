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
    ADMIN_V2_APP_ORIGIN: `https://admin-v2.example.com`,
  },
}));

describe(`OriginResolverService`, () => {
  let service: OriginResolverService;
  let originalEnvs: typeof envs;

  beforeEach(async () => {
    originalEnvs = { ...envs };
    const module: TestingModule = await Test.createTestingModule({
      providers: [OriginResolverService],
    }).compile();

    service = module.get<OriginResolverService>(OriginResolverService);
  });

  afterEach(() => {
    Object.assign(envs, originalEnvs);
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
      expect(origins.has(`https://admin-v2.example.com`)).toBe(true);
      expect(origins.has(`https://allowed1.example.com`)).toBe(false);
    });

    it(`should normalize origins in the set`, () => {
      const origins = service.getAllowedOrigins();

      expect(origins.has(`https://consumer.example.com/`)).toBe(false);
      expect(origins.has(`https://consumer.example.com`)).toBe(true);
    });
  });

  describe(`validateConsumerAppScope`, () => {
    it(`accepts every supported consumer app scope`, () => {
      expect(service.validateConsumerAppScope(`consumer`)).toBe(`consumer`);
      expect(service.validateConsumerAppScope(`consumer-mobile`)).toBe(`consumer-mobile`);
      expect(service.validateConsumerAppScope(`consumer-css-grid`)).toBe(`consumer-css-grid`);
    });

    it(`rejects unknown or empty app scopes`, () => {
      expect(service.validateConsumerAppScope(undefined)).toBeUndefined();
      expect(service.validateConsumerAppScope(null)).toBeUndefined();
      expect(service.validateConsumerAppScope(`admin`)).toBeUndefined();
      expect(service.validateConsumerAppScope(``)).toBeUndefined();
    });
  });

  describe(`validateConsumerCorsOrigin`, () => {
    it(`should return undefined for undefined input`, () => {
      expect(service.validateConsumerCorsOrigin(undefined)).toBeUndefined();
    });

    it(`should return undefined for invalid URL`, () => {
      expect(service.validateConsumerCorsOrigin(`not-a-url`)).toBeUndefined();
    });

    it(`should return normalized origin for allowed origin`, () => {
      const result = service.validateConsumerCorsOrigin(`https://consumer.example.com/path`);
      expect(result).toBe(`https://consumer.example.com`);
    });

    it(`should return undefined for disallowed origin`, () => {
      const result = service.validateConsumerCorsOrigin(`https://evil.example.com/path`);
      expect(result).toBeUndefined();
    });

    it(`should handle trailing slashes`, () => {
      const result = service.validateConsumerCorsOrigin(`https://consumer.example.com/`);
      expect(result).toBe(`https://consumer.example.com`);
    });

    it(`should allow localhost consumer origin in development`, () => {
      (envs as any).NODE_ENV = `development`;

      const result = service.validateConsumerCorsOrigin(`http://127.0.0.1:3001/path`);
      expect(result).toBe(`http://127.0.0.1:3001`);
    });

    it(`should reject localhost consumer origin in production`, () => {
      (envs as any).NODE_ENV = `production`;

      const result = service.validateConsumerCorsOrigin(`http://127.0.0.1:3001/path`);
      expect(result).toBeUndefined();
    });
  });

  describe(`resolveConsumerOriginByScope`, () => {
    it(`returns the configured origin for each consumer scope`, () => {
      expect(service.resolveConsumerOriginByScope(`consumer`)).toBe(`https://consumer.example.com`);
      expect(service.resolveConsumerOriginByScope(`consumer-mobile`)).toBe(`https://mobile.example.com`);
      expect(service.resolveConsumerOriginByScope(`consumer-css-grid`)).toBe(`https://grid.example.com`);
    });

    it(`returns null when a scope has no configured canonical origin`, () => {
      (envs as any).CONSUMER_MOBILE_APP_ORIGIN = `CONSUMER_MOBILE_APP_ORIGIN`;

      expect(service.resolveConsumerOriginByScope(`consumer-mobile`)).toBeNull();
    });
  });

  describe(`resolveAdminRequestOrigin`, () => {
    it(`uses admin validation for admin paths`, () => {
      const result = service.resolveAdminRequestOrigin(`https://admin.example.com/dashboard`, undefined);

      expect(result).toBe(`https://admin.example.com`);
    });

    it(`accepts the dedicated admin-v2 origin`, () => {
      const result = service.resolveAdminRequestOrigin(`https://admin-v2.example.com/consumers`, undefined);

      expect(result).toBe(`https://admin-v2.example.com`);
    });

    it(`allows the admin-v2 local dev port in development`, () => {
      (envs as any).NODE_ENV = `development`;

      const result = service.resolveAdminRequestOrigin(`http://127.0.0.1:3011/consumers`, undefined);
      expect(result).toBe(`http://127.0.0.1:3011`);
    });
  });
});
