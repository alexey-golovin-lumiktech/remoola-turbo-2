import { Body, Controller, Inject, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { AuthService } from './auth.service'

import { PublicEndpoint } from 'src/decorators'
import { AdminDTOS } from 'src/dtos'

@ApiTags(`admin`)
@Controller(`admin/auth`)
export class AuthController {
  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post(`/login`)
  @PublicEndpoint(/* reason: react-admin auth provider */)
  @ApiOkResponse({ type: AdminDTOS.Access })
  login(@Body() body: AdminDTOS.Credentials): Promise<AdminDTOS.Access> {
    return this.service.login(body)
  }
}
