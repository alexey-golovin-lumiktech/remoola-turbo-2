import { type Response } from 'express';

import { CONSUMER_APP_SCOPE_HEADER } from '@remoola/api-types';

jest.mock(`../../shared/origin-resolver.service`, () => ({
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

import { deviceIdMiddleware, type RequestWithDeviceId } from './device-id.middleware';
import { getApiConsumerDeviceCookieKeysForRead } from '../../shared-common/auth-cookie-policy';

describe(`deviceIdMiddleware`, () => {
  const validUuid = `a1b2c3d4-e5f6-4178-89ab-cdef01234567`;
  const validNonV4Uuid = `a1b2c3d4-e5f6-1178-89ab-cdef01234567`;
  const [secureDeviceCookieKey, localDeviceCookieKey] = getApiConsumerDeviceCookieKeysForRead();
  const [, mobileLocalDeviceCookieKey] = getApiConsumerDeviceCookieKeysForRead(`consumer-mobile`);

  function mockReq(overrides: Partial<RequestWithDeviceId> = {}): RequestWithDeviceId {
    return {
      path: `/api/consumer/auth/login`,
      cookies: {},
      signedCookies: {},
      headers: {
        origin: `https://app.example.com`,
        [CONSUMER_APP_SCOPE_HEADER]: `consumer`,
      } as any,
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
    const req = mockReq({ path: `/api/admin-v2/users` });
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

  it(`rejects when app scope header is missing`, (done) => {
    const req = mockReq({ headers: {} as any });
    const res = mockRes();
    const next = jest.fn((error?: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(`Invalid app scope`);
      expect(req.deviceId).toBeUndefined();
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it(`skips browser oauth start without requiring app scope header`, (done) => {
    const req = mockReq({ method: `GET`, path: `/api/consumer/auth/google/start`, headers: {} as any });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBeUndefined();
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it(`skips browser oauth callback without requiring app scope header`, (done) => {
    const req = mockReq({ method: `GET`, path: `/api/consumer/auth/google/callback`, headers: {} as any });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBeUndefined();
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it(`skips token-only verification routes without requiring app scope header`, (done) => {
    const req = mockReq({ method: `GET`, path: `/api/consumer/auth/forgot-password/verify`, headers: {} as any });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBeUndefined();
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it(`skips signup verification without requiring app scope header`, (done) => {
    const req = mockReq({ method: `GET`, path: `/api/consumer/auth/signup/verification`, headers: {} as any });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBeUndefined();
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it(`skips stripe webhooks without requiring app scope header`, (done) => {
    const req = mockReq({ method: `POST`, path: `/api/consumer/webhooks`, headers: {} as any });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBeUndefined();
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it(`skips singular stripe webhook path without requiring app scope header`, (done) => {
    const req = mockReq({ method: `POST`, path: `/api/consumer/webhook`, headers: {} as any });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBeUndefined();
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it(`rejects password reset without app scope header because it is BFF-only public`, (done) => {
    const req = mockReq({ method: `POST`, path: `/api/consumer/auth/password/reset`, headers: {} as any });
    const res = mockRes();
    const next = jest.fn((error?: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(`Invalid app scope`);
      expect(req.deviceId).toBeUndefined();
      expect(res.cookie).not.toHaveBeenCalled();
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it(`rejects complete-profile-creation without app scope header because it is BFF-only public`, (done) => {
    const req = mockReq({
      method: `GET`,
      path: `/api/consumer/auth/signup/consumer-123/complete-profile-creation`,
      headers: {} as any,
    });
    const res = mockRes();
    const next = jest.fn((error?: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(`Invalid app scope`);
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

  it(`ignores unsigned legacy cookie values and rotates to a new signed cookie`, (done) => {
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

  it(`uses the mobile device namespace selected by explicit app scope`, (done) => {
    const req = mockReq({
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: `consumer-mobile`,
      } as any,
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

  it(`rotates a mobile unsigned cookie into a new mobile signed cookie`, (done) => {
    const req = mockReq({
      headers: {
        origin: `https://mobile.example.com`,
        [CONSUMER_APP_SCOPE_HEADER]: `consumer-mobile`,
      } as any,
      cookies: { [mobileLocalDeviceCookieKey]: validUuid },
    });
    const res = mockRes();
    const next = jest.fn(() => {
      expect(req.deviceId).toBeDefined();
      expect(req.deviceId).not.toBe(validUuid);
      expect(res.cookie).toHaveBeenCalledWith(
        mobileLocalDeviceCookieKey,
        expect.any(String),
        expect.objectContaining({ signed: true }),
      );
      done();
    });
    deviceIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
