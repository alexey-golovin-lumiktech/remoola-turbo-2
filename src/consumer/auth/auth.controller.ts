import { Body, Controller, Inject, Logger, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { AccessToken, LoginBody } from '../../dtos'
import { AuthService } from './auth.service'
import { ConfigService } from '@nestjs/config'
import { GoogleLogin } from 'src/dtos/consumer/google-profile.dto'

@ApiTags(`consumer`)
@Controller(`consumer/auth`)
export class AuthController {
  logger = new Logger(AuthController.name)

  constructor(@Inject(AuthService) private readonly service: AuthService, private readonly configService: ConfigService) {}

  @Post(`/login`)
  @ApiOkResponse({ type: AccessToken, status: 200 })
  login(@Body() body: LoginBody): Promise<AccessToken> {
    return this.service.login(body)
  }

  @Post(`/google-login`)
  @ApiOkResponse({ type: AccessToken, status: 200 })
  googleLogin(@Body() body: GoogleLogin): Promise<AccessToken> {
    return this.service.googleLogin(body)
  }
}
