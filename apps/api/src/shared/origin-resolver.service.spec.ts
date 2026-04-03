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
      expect(origins.has(`https://admin.example.com`)).toBe(true);
    });

    it(`should normalize origins in the set`, () => {
      const origins = service.getAllowedOrigins();

      expect(origins.has(`https://consumer.example.com/`)).toBe(false);
      expect(origins.has(`https://consumer.example.com`)).toBe(true);
    });
  });

  describe(`validateReturnOrigin`, () => {
    let originalEnvs: typeof envs;

    beforeEach(() => {
      originalEnvs = { ...envs };
    });

    afterEach(() => {
      Object.assign(envs, originalEnvs);
    });

    it(`should return undefined for undefined input`, () => {
      expect(service.validateReturnOrigin(undefined)).toBeUndefined();
    });

    it(`should return undefined for invalid URL`, () => {
      expect(service.validateReturnOrigin(`not-a-url`)).toBeUndefined();
    });

    it(`should return normalized origin for allowed origin`, () => {
      const result = service.validateReturnOrigin(`https://consumer.example.com/path`);
      expect(result).toBe(`https://consumer.example.com`);
    });

    it(`should return undefined for disallowed origin`, () => {
      const result = service.validateReturnOrigin(`https://evil.example.com/path`);
      expect(result).toBeUndefined();
    });

    it(`should handle trailing slashes`, () => {
      const result = service.validateReturnOrigin(`https://consumer.example.com/`);
      expect(result).toBe(`https://consumer.example.com`);
    });

    it(`should allow localhost mobile origin in development when allowlist is narrowed`, () => {
      (envs as any).NODE_ENV = `development`;
      (envs as any).CORS_ALLOWED_ORIGINS = [`https://allowed1.example.com`];

      const result = service.validateReturnOrigin(`http://localhost:3002/path`);
      expect(result).toBe(`http://localhost:3002`);
    });

    it(`should reject localhost mobile origin in production when not allowlisted`, () => {
      (envs as any).NODE_ENV = `production`;
      (envs as any).CORS_ALLOWED_ORIGINS = [`https://allowed1.example.com`];

      const result = service.validateReturnOrigin(`http://localhost:3002/path`);
      expect(result).toBeUndefined();
    });
  });

  describe(`resolveConsumerOrigin`, () => {
    it(`should return validated returnOrigin if provided`, () => {
      const result = service.resolveConsumerOrigin(`https://consumer.example.com/some/path`);
      expect(result).toBe(`https://consumer.example.com`);
    });

    it(`should fallback to CONSUMER_APP_ORIGIN`, () => {
      const result = service.resolveConsumerOrigin();
      expect(result).toBe(`https://consumer.example.com`);
    });

    it(`should ignore invalid returnOrigin and use fallback`, () => {
      const result = service.resolveConsumerOrigin(`https://evil.example.com`);
      expect(result).toBe(`https://consumer.example.com`);
    });
  });

  describe(`resolveConsumerOrigin - with placeholder values`, () => {
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

      const result = service.resolveConsumerOrigin();
      expect(result).toBe(`https://mobile.example.com`);
    });

    it(`should return null when both APP origins are placeholders`, () => {
      (envs as any).CONSUMER_APP_ORIGIN = `CONSUMER_APP_ORIGIN`;
      (envs as any).CONSUMER_MOBILE_APP_ORIGIN = `CONSUMER_MOBILE_APP_ORIGIN`;
      (envs as any).CORS_ALLOWED_ORIGINS = [`https://cors.example.com`];

      const result = service.resolveConsumerOrigin();
      expect(result).toBeNull();
    });

    it(`should return null when no valid origins are available`, () => {
      (envs as any).CONSUMER_APP_ORIGIN = `CONSUMER_APP_ORIGIN`;
      (envs as any).CONSUMER_MOBILE_APP_ORIGIN = `CONSUMER_MOBILE_APP_ORIGIN`;
      (envs as any).CORS_ALLOWED_ORIGINS = [];

      const result = service.resolveConsumerOrigin();
      expect(result).toBeNull();
    });
  });
});
