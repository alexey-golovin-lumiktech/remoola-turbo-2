import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import express from 'express';

import { AdminAuthService } from './admin-auth.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext, PublicEndpoint } from '../../common';
import { ADMIN } from '../../dtos';
import { Credentials } from '../../dtos/admin';
import { JWT_ACCESS_TTL, JWT_REFRESH_TTL } from '../../envs';
import {
  ADMIN_ACCESS_TOKEN_COOKIE_KEY,
  ADMIN_REFRESH_TOKEN_COOKIE_KEY,
  getApiAdminAuthCookieClearOptions,
  getApiAdminAuthCookieOptions,
} from '../../shared-common';

@ApiTags(`Admin: Auth`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`admin/auth`)
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  private setAuthCookies(res: express.Response, accessToken: string, refreshToken: string) {
    const common = getApiAdminAuthCookieOptions();
    res.cookie(ADMIN_ACCESS_TOKEN_COOKIE_KEY, accessToken, { ...common, maxAge: JWT_ACCESS_TTL });
    res.cookie(ADMIN_REFRESH_TOKEN_COOKIE_KEY, refreshToken, { ...common, maxAge: JWT_REFRESH_TTL });
  }

  @PublicEndpoint()
  @Post(`login`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ operationId: `admin_auth_login` })
  @ApiOkResponse({ type: ADMIN.Access })
  async login(@Req() req: express.Request, @Res({ passthrough: true }) res, @Body() body: Credentials) {
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`];
    const userAgent = req.headers[`user-agent`] ?? null;
    const data = await this.service.login(body, {
      ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
      userAgent: typeof userAgent === `string` ? userAgent : null,
    });
    this.setAuthCookies(res, data.accessToken, data.refreshToken);
    return data;
  }

  @PublicEndpoint()
  @Post(`refresh-access`)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ operationId: `refresh_access` })
  @ApiBody({ schema: { type: `object`, properties: { refreshToken: { type: `string` } } } })
  @ApiOkResponse({ type: ADMIN.Access })
  refreshAccess(@Body(`refreshToken`) refreshToken: string) {
    return this.service.refreshAccess(refreshToken);
  }

  @Post(`logout`)
  async logout(@Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    const ipAddress = req.ip ?? req.headers[`x-forwarded-for`];
    const userAgent = req.headers[`user-agent`] ?? null;
    await this.service.revokeSessionByRefreshTokenAndAudit(req.cookies?.[ADMIN_REFRESH_TOKEN_COOKIE_KEY], {
      ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
      userAgent: typeof userAgent === `string` ? userAgent : null,
    });

    const cookieOptions = getApiAdminAuthCookieClearOptions();
    res.clearCookie(ADMIN_ACCESS_TOKEN_COOKIE_KEY, cookieOptions);
    res.clearCookie(ADMIN_REFRESH_TOKEN_COOKIE_KEY, cookieOptions);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get(`me`)
  async me(@Identity() identity: IIdentityContext) {
    return identity;
  }
}
