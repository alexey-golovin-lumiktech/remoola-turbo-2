import { type Response } from 'express';

import { deviceIdMiddleware, type RequestWithDeviceId } from './device-id.middleware';
import { envs } from '../../envs';

describe(`deviceIdMiddleware`, () => {
  const validUuid = `a1b2c3d4-e5f6-4178-89ab-cdef01234567`;
  const validNonV4Uuid = `a1b2c3d4-e5f6-1178-89ab-cdef01234567`;
  const initialUnsignedFallback = envs.CONSUMER_DEVICE_ID_ALLOW_UNSIGNED_FALLBACK;

  afterEach(() => {
    envs.CONSUMER_DEVICE_ID_ALLOW_UNSIGNED_FALLBACK = initialUnsignedFallback;
  });

  function mockReq(overrides: Partial<RequestWithDeviceId> = {}): RequestWithDeviceId {
    return {
      path: `/api/consumer/auth/login`,
      cookies: {},
      signedCookies: {},
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
    const req = mockReq({ signedCookies: { consumer_device_id: validUuid } });
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
      signedCookies: { consumer_device_id: validUuid },
      cookies: { consumer_device_id: `invalid` },
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
    const req = mockReq({ cookies: { consumer_device_id: `not-a-uuid` } });
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
    const req = mockReq({ signedCookies: { consumer_device_id: validNonV4Uuid } });
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
        [`__Host-device_id`]: `invalid`,
        [`consumer_device_id`]: validUuid,
      },
      cookies: {
        [`__Host-device_id`]: `invalid`,
        [`consumer_device_id`]: validUuid,
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
    const req = mockReq({ cookies: { consumer_device_id: validUuid } });
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
    const req = mockReq({ cookies: { consumer_device_id: validUuid } });
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

    const firstReq = mockReq({ signedCookies: { consumer_device_id: firstDeviceId } });
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
});
