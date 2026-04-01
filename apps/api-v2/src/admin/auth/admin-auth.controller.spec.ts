import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { envs } from '../../envs';
import {
  ADMIN_ACCESS_TOKEN_COOKIE_KEY,
  ADMIN_REFRESH_TOKEN_COOKIE_KEY,
  getApiAdminAuthCookieClearOptions,
  getApiAdminAuthCookieOptions,
} from '../../shared-common';

import type express from 'express';

describe(`AdminAuthController`, () => {
  let controller: AdminAuthController;
  let service: {
    login: jest.Mock;
    refreshAccess: jest.Mock;
    revokeSessionByRefreshTokenAndAudit: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      login: jest.fn(),
      refreshAccess: jest.fn(),
      revokeSessionByRefreshTokenAndAudit: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [{ provide: AdminAuthService, useValue: service }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminAuthController);
  });

  it(`sets admin auth cookies with env-based maxAge on login`, async () => {
    const req = {
      ip: `127.0.0.1`,
      headers: { 'user-agent': `jest` },
    } as unknown as express.Request;
    const res = {
      cookie: jest.fn(),
    } as unknown as express.Response;
    const data = {
      accessToken: `access-token`,
      refreshToken: `refresh-token`,
      id: `admin-1`,
      email: `admin@example.com`,
      type: `ADMIN`,
    };
    service.login.mockResolvedValue(data);

    const result = await controller.login(req, res, { email: `admin@example.com`, password: `secret` });

    const common = getApiAdminAuthCookieOptions();
    expect(res.cookie).toHaveBeenNthCalledWith(1, ADMIN_ACCESS_TOKEN_COOKIE_KEY, data.accessToken, {
      ...common,
      maxAge: envs.JWT_ACCESS_TOKEN_EXPIRES_IN,
    });
    expect(res.cookie).toHaveBeenNthCalledWith(2, ADMIN_REFRESH_TOKEN_COOKIE_KEY, data.refreshToken, {
      ...common,
      maxAge: envs.JWT_REFRESH_TOKEN_EXPIRES_IN,
    });
    expect(result).toEqual(data);
  });

  it(`revokes session and clears both cookies on logout`, async () => {
    const req = {
      ip: `192.168.0.10`,
      headers: { 'user-agent': `mobile-app` },
      cookies: { [ADMIN_REFRESH_TOKEN_COOKIE_KEY]: `refresh-token` },
    } as unknown as express.Request;
    const res = {
      clearCookie: jest.fn(),
    } as unknown as express.Response;
    service.revokeSessionByRefreshTokenAndAudit.mockResolvedValue(undefined);

    const result = await controller.logout(req, res);

    expect(service.revokeSessionByRefreshTokenAndAudit).toHaveBeenCalledWith(`refresh-token`, {
      ipAddress: `192.168.0.10`,
      userAgent: `mobile-app`,
    });
    const cookieOptions = getApiAdminAuthCookieClearOptions();
    expect(res.clearCookie).toHaveBeenNthCalledWith(1, ADMIN_ACCESS_TOKEN_COOKIE_KEY, cookieOptions);
    expect(res.clearCookie).toHaveBeenNthCalledWith(2, ADMIN_REFRESH_TOKEN_COOKIE_KEY, cookieOptions);
    expect(result).toEqual({ ok: true });
  });
});
