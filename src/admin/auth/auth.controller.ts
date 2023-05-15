import { Body, Controller, Inject, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { AccessAdmin, Credentials } from '../../dtos'

import { AuthService } from './auth.service'

import { PublicEndpoint } from 'src/decorators'

@ApiTags(`admin`)
@Controller(`admin/auth`)
export class AuthController {
  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post(`/login`)
  @PublicEndpoint(/* reason: react-admin auth provider */)
  @ApiOkResponse({ type: AccessAdmin })
  login(@Body() body: Credentials): Promise<AccessAdmin> {
    return this.service.login(body)
  }
}
