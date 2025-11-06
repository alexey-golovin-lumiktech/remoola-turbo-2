import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { IAdminModel } from '@remoola/database';

import { AdminAuthService } from './auth.service';
import { Identity, PublicEndpoint } from '../../common/decorators';
import { ADMIN } from '../../dtos';

@ApiTags(`Admin: Auth`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`auth`)
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  @Post(`login`)
  @ApiOperation({ operationId: `admin_auth_login` })
  @ApiOkResponse({ type: ADMIN.Access })
  login(@Identity() identity: IAdminModel) {
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
