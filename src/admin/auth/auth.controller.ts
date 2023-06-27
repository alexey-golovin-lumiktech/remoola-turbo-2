import { Controller, Inject, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { ReqAuthIdentity } from 'src/guards/auth.guard'
import { IAdminModel } from 'src/models'

import { ADMIN } from '../../dtos'

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
