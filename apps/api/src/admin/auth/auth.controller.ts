import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import express from 'express';

import { type AdminModel } from '@remoola/database-2';

import { AdminAuthService } from './auth.service';
import { Identity, PublicEndpoint } from '../../common/decorators';
import { ADMIN } from '../../dtos';
import { envs, JWT_ACCESS_TTL, JWT_REFRESH_TTL } from '../../envs';

@ApiTags(`Admin: Auth`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`auth`)
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  private setAuthCookies(res: express.Response, access: string, refresh: string) {
    const isProd = envs.NODE_ENV == `production`;
    const sameSite = isProd ? (`none` as const) : (`lax` as const);
    const secure = isProd || process.env.COOKIE_SECURE == `true`;

    const common = {
      httpOnly: true,
      sameSite,
      secure,
      path: `/`,
    };

    res.cookie(`access_token`, access, { ...common, maxAge: JWT_ACCESS_TTL });
    res.cookie(`refresh_token`, refresh, { ...common, maxAge: JWT_REFRESH_TTL });
  }

  @Post(`login`)
  @ApiOperation({ operationId: `admin_auth_login` })
  @ApiOkResponse({ type: ADMIN.Access })
  async login(@Res({ passthrough: true }) res, @Identity() identity: AdminModel) {
    const data = await this.service.login(identity);
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
}
