import { Controller, Inject, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { ADMIN } from '../../dtos'
import { ReqAuthIdentity } from '../../guards/auth.guard'
import { IAdminModel } from '../../models'

import { AuthService } from './auth.service'

@ApiTags(`admin`)
@Controller(`admin/auth`)
export class AuthController {
  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post(`/login`)
  @ApiOkResponse({ type: ADMIN.Access })
  login(@ReqAuthIdentity() identity: IAdminModel): Promise<ADMIN.Access> {
    return this.service.login(identity)
  }
}
