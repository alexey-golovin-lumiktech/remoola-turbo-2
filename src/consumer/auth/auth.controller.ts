import { Body, Controller, Get, Inject, Logger, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Credentials } from '../../dtos'
import { AuthService } from './auth.service'
import { GoogleLogin } from 'src/dtos/consumer/googleProfile.dto'
import { AccessConsumer } from 'src/dtos/consumer'

@ApiTags(`consumer`)
@Controller(`consumer/auth`)
export class AuthController {
  logger = new Logger(AuthController.name)

  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post(`/login`)
  @ApiOkResponse({ type: AccessConsumer, status: 200 })
  login(@Body() credentials: Credentials): Promise<AccessConsumer> {
    return this.service.login(credentials)
  }

  @Post(`/google-login`)
  @ApiOkResponse({ type: AccessConsumer, status: 200 })
  googleLogin(@Body() body: GoogleLogin): Promise<AccessConsumer> {
    return this.service.googleLogin(body)
  }

  @Post(`signup`)
  signup(@Body() credentials: Credentials): Promise<any> {
    return this.service.signup(credentials)
  }

  @Get(`/random-pass`)
  getRandomPassword(): Promise<string> {
    return this.service.getRandomPassword()
  }
}
