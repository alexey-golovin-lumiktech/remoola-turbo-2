import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import express from 'express';

import { type AdminModel } from '@remoola/database-2';

import { AdminAuthService } from './admin-auth.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, PublicEndpoint } from '../../common';
import { ADMIN } from '../../dtos';
import { envs, JWT_ACCESS_TTL, JWT_REFRESH_TTL } from '../../envs';
import { ACCESS_TOKEN_COOKIE_KEY, REFRESH_TOKEN_COOKIE_KEY } from '../../shared-common';

@ApiTags(`Admin: Auth`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`admin/auth`)
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  private setAuthCookies(res: express.Response, accessToken: string, refreshToken: string) {
    const isProd = envs.NODE_ENV === `production`;

    if (envs.VERCEL !== 0) {
      const vercelCookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: `none`,
        path: `/`,
      } as const;
      res.cookie(ACCESS_TOKEN_COOKIE_KEY, accessToken, { ...vercelCookieOptions, maxAge: JWT_ACCESS_TTL });
      res.cookie(REFRESH_TOKEN_COOKIE_KEY, refreshToken, { ...vercelCookieOptions, maxAge: JWT_REFRESH_TTL });
    } else {
      const sameSite = isProd ? (`none` as const) : (`lax` as const);
      const secure = isProd || process.env.COOKIE_SECURE == `true`;

      const common = {
        httpOnly: true,
        sameSite,
        secure,
        path: `/`,
      };

      res.cookie(ACCESS_TOKEN_COOKIE_KEY, accessToken, { ...common, maxAge: JWT_ACCESS_TTL });
      res.cookie(REFRESH_TOKEN_COOKIE_KEY, refreshToken, { ...common, maxAge: JWT_REFRESH_TTL });
    }
  }

  @PublicEndpoint()
  @Post(`login`)
  @ApiOperation({ operationId: `admin_auth_login` })
  @ApiOkResponse({ type: ADMIN.Access })
  async login(@Res({ passthrough: true }) res, @Body() body: any) {
    const data = await this.service.login(body);
    this.setAuthCookies(res, data.accessToken, data.refreshToken);
    return data;
  }

  @PublicEndpoint()
  @Post(`refresh-access`)
  @ApiOperation({ operationId: `refresh_access` })
  @ApiBody({ schema: { type: `object`, properties: { refreshToken: { type: `string` } } } })
  @ApiOkResponse({ type: ADMIN.Access })
  refreshAccess(@Body(`refreshToken`) refreshToken: string) {
    return this.service.refreshAccess(refreshToken);
  }

  @Post(`logout`)
  async logout(@Res({ passthrough: true }) res: express.Response) {
    let cookieOptions;

    if (envs.VERCEL !== 0) {
      cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: `none`,
        path: `/`,
      } as const;
    } else {
      const isProd = process.env.NODE_ENV === `production`;
      cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? `none` : `lax`,
        path: `/`,
      };
    }

    res.clearCookie(ACCESS_TOKEN_COOKIE_KEY, cookieOptions);
    res.clearCookie(REFRESH_TOKEN_COOKIE_KEY, cookieOptions);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get(`me`)
  async me(@Identity() admin: AdminModel) {
    return admin;
  }
}
