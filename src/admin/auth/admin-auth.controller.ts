import { Body, Controller, Inject, Post } from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

import { IAdminModel } from '@wirebill/shared-common/models'

import { PublicEndpoint } from '@-/decorators'
import { ADMIN } from '@-/dtos'
import { ReqAuthIdentity } from '@-/guards/auth.guard'

import { AdminAuthService } from './admin-auth.service'

@ApiTags(`admin`)
@Controller(`admin/auth`)
export class AdminAuthController {
  constructor(@Inject(AdminAuthService) private readonly service: AdminAuthService) {}

  @Post(`/login`)
  @ApiOperation({ operationId: `admin_auth_login` })
  @ApiOkResponse({ type: ADMIN.Access })
  login(@ReqAuthIdentity() identity: IAdminModel): Promise<ADMIN.Access> {
    return this.service.login(identity)
  }

  @PublicEndpoint()
  @Post(`/refresh-access`)
  @ApiOperation({ operationId: `refresh_access` })
  @ApiBody({ schema: { type: `object`, properties: { refreshToken: { type: `string` } } } })
  @ApiOkResponse({ type: ADMIN.Access })
  refreshAccess(@Body(`refreshToken`) refreshToken: string): Promise<ADMIN.Access | unknown> {
    return this.service.refreshAccess(refreshToken)
  }
}
