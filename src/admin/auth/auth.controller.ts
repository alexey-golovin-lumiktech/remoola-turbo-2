import { Body, Controller, Inject, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { AuthService } from './auth.service'

import { PublicEndpoint } from 'src/decorators'
import { ADMIN } from 'src/dtos'

@ApiTags(`admin`)
@Controller(`admin/auth`)
export class AuthController {
  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post(`/login`)
  @PublicEndpoint(/* reason: react-admin auth provider */)
  @ApiOkResponse({ type: ADMIN.Access })
  login(@Body() body: ADMIN.Credentials): Promise<ADMIN.Access> {
    return this.service.login(body)
  }
}
