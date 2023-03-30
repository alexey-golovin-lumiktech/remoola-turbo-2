import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { AccessToken, LoginBody } from 'src/dtos'
import { AuthService } from './auth.service'

@ApiTags(`admin`)
@Controller(`auth`)
export class AuthController {
  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post(`/login`)
  @UseGuards(AuthGuard(`basic`))
  @ApiOkResponse({ type: AccessToken, status: 200 })
  login(@Body() body: LoginBody): Promise<AccessToken> {
    return this.service.login(body)
  }
}
