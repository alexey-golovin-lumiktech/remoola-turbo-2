import { type Response } from 'express';

jest.mock(`../../shared/origin-resolver.service`, () => ({
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

import { deviceIdMiddleware, type RequestWithDeviceId } from './device-id.middleware';
import { envs } from '../../envs';
import { getApiConsumerDeviceCookieKeysForRead } from '../../shared-common/auth-cookie-policy';

describe(`deviceIdMiddleware`, () => {
  const validUuid = `a1b2c3d4-e5f6-4178-89ab-cdef01234567`;
  const validNonV4Uuid = `a1b2c3d4-e5f6-1178-89ab-cdef01234567`;
  const initialUnsignedFallback = envs.CONSUMER_DEVICE_ID_ALLOW_UNSIGNED_FALLBACK;
  const [secureDeviceCookieKey, localDeviceCookieKey] = getApiConsumerDeviceCookieKeysForRead();
  const [, mobileLocalDeviceCookieKey] = getApiConsumerDeviceCookieKeysForRead(`consumer-mobile`);

  afterEach(() => {
    envs.CONSUMER_DEVICE_ID_ALLOW_UNSIGNED_FALLBACK = initialUnsignedFallback;
  });

  function mockReq(overrides: Partial<RequestWithDeviceId> = {}): RequestWithDeviceId {
    return {
      path: `/api/consumer/auth/login`,
      cookies: {},
      signedCookies: {},
      headers: {},
      ...overrides,
    } as RequestWithDeviceId;
  }

  function mockRes(): { cookie: jest.Mock } & Response {
    return { cookie: jest.fn() } as unknown as { cookie: jest.Mock } & Response;
  }

  it(`sets req.deviceId and sets cookie when path is consumer and no valid cookie`, (done) => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBeDefined();
      expect(typeof req.deviceId).toBe(`string`);
      expect(req.deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(res.cookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ signed: true }),
      );
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it(`reuses existing valid device cookie when path is consumer`, (done) => {
    const req = mockReq({ signedCookies: { [localDeviceCookieKey]: validUuid } });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBe(validUuid);
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it(`reuses existing valid signed device cookie when present`, (done) => {
    const req = mockReq({
      signedCookies: { [localDeviceCookieKey]: validUuid },
      cookies: { [localDeviceCookieKey]: `invalid` },
    });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBe(validUuid);
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it(`does not set deviceId for non-consumer path`, (done) => {
    const req = mockReq({ path: `/api/admin/users` });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBeUndefined();
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it(`does not set deviceId for near-match non-consumer prefix`, (done) => {
    const req = mockReq({ path: `/api/consumerx/auth/login` });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBeUndefined();
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it(`generates new deviceId when cookie value is invalid (not a UUID)`, (done) => {
    const req = mockReq({ cookies: { [localDeviceCookieKey]: `not-a-uuid` } });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBeDefined();
      expect(req.deviceId).not.toBe(`not-a-uuid`);
      expect(res.cookie).toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it(`generates a new deviceId when cookie value is UUID but not v4`, (done) => {
    const req = mockReq({ signedCookies: { [localDeviceCookieKey]: validNonV4Uuid } });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBeDefined();
      expect(req.deviceId).not.toBe(validNonV4Uuid);
      expect(req.deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(res.cookie).toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it(`reuses valid fallback device cookie key when primary key is invalid`, (done) => {
    const req = mockReq({
      signedCookies: {
        [secureDeviceCookieKey]: `invalid`,
        [localDeviceCookieKey]: validUuid,
      },
      cookies: {
        [secureDeviceCookieKey]: `invalid`,
        [localDeviceCookieKey]: validUuid,
      },
    });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBe(validUuid);
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it(`accepts legacy unsigned cookie and rotates to signed cookie`, (done) => {
    envs.CONSUMER_DEVICE_ID_ALLOW_UNSIGNED_FALLBACK = true;
    const req = mockReq({ cookies: { [localDeviceCookieKey]: validUuid } });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBe(validUuid);
      expect(res.cookie).toHaveBeenCalledWith(expect.any(String), validUuid, expect.objectContaining({ signed: true }));
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it(`ignores unsigned legacy cookie when unsigned fallback is disabled`, (done) => {
    envs.CONSUMER_DEVICE_ID_ALLOW_UNSIGNED_FALLBACK = false;
    const req = mockReq({ cookies: { [localDeviceCookieKey]: validUuid } });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBeDefined();
      expect(req.deviceId).not.toBe(validUuid);
      expect(res.cookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ signed: true }),
      );
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it(`generates a new deviceId after cookie is cleared and consumer revisits`, () => {
    const firstDeviceId = `11111111-1111-4111-8111-111111111111`;

    const firstReq = mockReq({ signedCookies: { [localDeviceCookieKey]: firstDeviceId } });
    const firstRes = mockRes();
    const firstNext = jest.fn();
    deviceIdMiddleware(firstReq, firstRes, firstNext);

    expect(firstReq.deviceId).toBe(firstDeviceId);
    expect(firstRes.cookie).not.toHaveBeenCalled();
    expect(firstNext).toHaveBeenCalled();

    // Simulate browser cookie clear, then revisit.
    const revisitReq = mockReq({ cookies: {} });
    const revisitRes = mockRes();
    const revisitNext = jest.fn();
    deviceIdMiddleware(revisitReq, revisitRes, revisitNext);

    expect(revisitReq.deviceId).toBeDefined();
    expect(revisitReq.deviceId).not.toBe(firstDeviceId);
    expect(revisitRes.cookie).toHaveBeenCalled();
    expect(revisitNext).toHaveBeenCalled();
  });

  it(`uses the mobile device namespace selected by trusted origin`, (done) => {
    const req = mockReq({
      headers: { origin: `https://mobile.example.com` } as any,
      signedCookies: { [mobileLocalDeviceCookieKey]: validUuid },
    });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBe(validUuid);
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it(`rotates a mobile unsigned fallback cookie into the mobile signed cookie`, (done) => {
    envs.CONSUMER_DEVICE_ID_ALLOW_UNSIGNED_FALLBACK = true;
    const req = mockReq({
      headers: { origin: `https://mobile.example.com` } as any,
      cookies: { [mobileLocalDeviceCookieKey]: validUuid },
    });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBe(validUuid);
      expect(res.cookie).toHaveBeenCalledWith(
        mobileLocalDeviceCookieKey,
        validUuid,
        expect.objectContaining({ signed: true }),
      );
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
