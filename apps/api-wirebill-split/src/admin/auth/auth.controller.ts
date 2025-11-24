import { Body, Controller, Post } from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import express from 'express';

import { type AdminModel } from '@remoola/database';

import { AdminAuthService } from './auth.service';
import { Identity, PublicEndpoint } from '../../common/decorators';
import { ADMIN } from '../../dtos';
import { envs } from '../../envs';

@ApiTags(`Admin: Auth`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`auth`)
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  private setAuthCookies(res: express.Response, access: string, refresh: string) {
    const isProd = envs.NODE_ENV == `production`;
    // const domain = isProd ? parsedEnvs.COOKIE_DOMAIN : undefined; // ❌ don't set on localhost(127.0.0.1)
    const sameSite = isProd ? (`none` as const) : (`lax` as const);
    const secure = isProd || process.env.COOKIE_SECURE == `true`;

    const common = {
      httpOnly: true,
      sameSite,
      secure,
      path: `/`,
    };

    res.cookie(`access_token`, access, { ...common, maxAge: 1000 * 60 * 15 });
    res.cookie(`refresh_token`, refresh, { ...common, maxAge: 1000 * 60 * 60 * 24 * 7 });
  }

  @Post(`login`)
  @ApiOperation({ operationId: `admin_auth_login` })
  @ApiOkResponse({ type: ADMIN.Access })
  login(@Identity() identity: AdminModel) {
    return this.service.login(identity);
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
