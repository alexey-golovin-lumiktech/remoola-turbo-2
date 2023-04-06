import { Body, Controller, Inject, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { AccessAdmin, LoginBody } from '../../dtos'
import { AuthService } from './auth.service'

@ApiTags(`admin`)
@Controller(`admin/auth`)
export class AuthController {
  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post(`/login`)
  @ApiOkResponse({ type: AccessAdmin, status: 200 })
  login(@Body() body: LoginBody): Promise<AccessAdmin> {
    return this.service.login(body)
  }
}
