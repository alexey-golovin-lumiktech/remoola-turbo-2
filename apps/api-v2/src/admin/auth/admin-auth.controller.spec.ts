import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { envs } from '../../envs';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import {
  getApiAdminAccessTokenCookieKey,
  getApiAdminAuthCookieClearOptions,
  getApiAdminAuthCookieOptions,
  getApiAdminCsrfCookieClearOptions,
  getApiAdminCsrfCookieOptions,
  getApiAdminCsrfTokenCookieKey,
  getApiAdminRefreshTokenCookieKey,
} from '../../shared-common';

import type express from 'express';

describe(`AdminAuthController`, () => {
  let controller: AdminAuthController;
  let service: {
    login: jest.Mock;
    refreshAccess: jest.Mock;
    revokeSessionByRefreshTokenAndAudit: jest.Mock;
  };
  let originResolver: { resolveAdminRequestOrigin: jest.Mock };

  beforeEach(async () => {
    service = {
      login: jest.fn(),
      refreshAccess: jest.fn(),
      revokeSessionByRefreshTokenAndAudit: jest.fn(),
    };
    originResolver = {
      resolveAdminRequestOrigin: jest.fn(() => `https://admin.example.com`),
    };

    const module = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        { provide: AdminAuthService, useValue: service },
        { provide: OriginResolverService, useValue: originResolver },
      ],
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
    expect(res.cookie).toHaveBeenNthCalledWith(1, getApiAdminAccessTokenCookieKey(), data.accessToken, {
      ...common,
      maxAge: envs.JWT_ACCESS_TOKEN_EXPIRES_IN,
    });
    expect(res.cookie).toHaveBeenNthCalledWith(2, getApiAdminRefreshTokenCookieKey(), data.refreshToken, {
      ...common,
      maxAge: envs.JWT_REFRESH_TOKEN_EXPIRES_IN,
    });
    expect(res.cookie).toHaveBeenNthCalledWith(
      3,
      getApiAdminCsrfTokenCookieKey(),
      expect.any(String),
      getApiAdminCsrfCookieOptions(),
    );
    expect(result).toEqual({ ok: true });
  });

  it(`revokes session and clears both cookies on logout`, async () => {
    const req = {
      ip: `192.168.0.10`,
      headers: { 'user-agent': `mobile-app`, 'x-csrf-token': `csrf-token` },
      cookies: {
        [getApiAdminRefreshTokenCookieKey()]: `refresh-token`,
        [getApiAdminCsrfTokenCookieKey()]: `csrf-token`,
      },
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
    expect(res.clearCookie).toHaveBeenNthCalledWith(1, getApiAdminAccessTokenCookieKey(), cookieOptions);
    expect(res.clearCookie).toHaveBeenNthCalledWith(2, getApiAdminRefreshTokenCookieKey(), cookieOptions);
    expect(res.clearCookie).toHaveBeenNthCalledWith(
      3,
      getApiAdminCsrfTokenCookieKey(),
      getApiAdminCsrfCookieClearOptions(),
    );
    expect(result).toEqual({ ok: true });
  });

  it(`rejects logout without matching CSRF token`, async () => {
    const req = {
      headers: {},
      cookies: { [getApiAdminRefreshTokenCookieKey()]: `refresh-token` },
    } as unknown as express.Request;
    const res = {
      clearCookie: jest.fn(),
    } as unknown as express.Response;

    await expect(controller.logout(req, res)).rejects.toThrow(`Invalid CSRF token`);
    expect(service.revokeSessionByRefreshTokenAndAudit).not.toHaveBeenCalled();
  });

  it(`rejects refresh-access when origin header is invalid even with matching CSRF token`, async () => {
    const req = {
      headers: {
        origin: `https://evil.example`,
        'x-csrf-token': `csrf-token`,
      },
      cookies: {
        [getApiAdminCsrfTokenCookieKey()]: `csrf-token`,
        [getApiAdminRefreshTokenCookieKey()]: `refresh-token`,
      },
    } as unknown as express.Request;
    const res = {
      cookie: jest.fn(),
    } as unknown as express.Response;
    originResolver.resolveAdminRequestOrigin.mockReturnValue(undefined);

    await expect(controller.refreshAccess(req, res)).rejects.toThrow(`Invalid request origin`);
    expect(service.refreshAccess).not.toHaveBeenCalled();
  });

  it(`accepts referer fallback for refresh-access CSRF origin validation`, async () => {
    const req = {
      headers: {
        referer: `https://admin.example.com/dashboard`,
        'x-csrf-token': `csrf-token`,
      },
      cookies: {
        [getApiAdminCsrfTokenCookieKey()]: `csrf-token`,
        [getApiAdminRefreshTokenCookieKey()]: `refresh-token`,
      },
    } as unknown as express.Request;
    const res = {
      cookie: jest.fn(),
    } as unknown as express.Response;
    originResolver.resolveAdminRequestOrigin.mockReturnValue(`https://admin.example.com`);
    service.refreshAccess.mockResolvedValue({ accessToken: `new-access`, refreshToken: `new-refresh` });

    const result = await controller.refreshAccess(req, res);

    expect(originResolver.resolveAdminRequestOrigin).toHaveBeenCalledWith(
      undefined,
      `https://admin.example.com/dashboard`,
    );
    expect(service.refreshAccess).toHaveBeenCalledWith(`refresh-token`);
    expect(result).toEqual({ ok: true });
  });
});
