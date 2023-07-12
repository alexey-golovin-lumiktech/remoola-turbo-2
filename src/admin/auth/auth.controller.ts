import { Controller, Inject, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IAdminModel } from '@wirebill/shared-common/models'

import { ADMIN } from '../../dtos'
import { ReqAuthIdentity } from '../../guards/auth.guard'

import { AuthService } from './auth.service'

@ApiTags(`admin`)
@Controller(`admin/auth`)
export class AuthController {
  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post(`/login`)
  @ApiOkResponse({ type: ADMIN.Access })
  login(@ReqAuthIdentity() adminIdentity: IAdminModel): Promise<ADMIN.Access> {
    return this.service.login(adminIdentity)
  }
}
