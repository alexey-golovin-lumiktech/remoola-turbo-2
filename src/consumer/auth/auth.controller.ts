import { Body, Controller, Get, Inject, Logger, Post, Res, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Credentials, Signup } from '../../dtos'
import { AuthService } from './auth.service'
import { GoogleLogin } from 'src/dtos/consumer/googleProfile.dto'
import { AccessConsumer } from 'src/dtos/consumer'
import { Response } from 'express'

@ApiTags(`consumer`)
@Controller(`consumer/auth`)
export class AuthController {
  logger = new Logger(AuthController.name)

  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post(`/login`)
  @ApiOkResponse({ type: AccessConsumer, status: 200 })
  login(@Body() body: Credentials): Promise<AccessConsumer> {
    return this.service.login(body)
  }

  @Post(`/google-login`)
  @ApiOkResponse({ type: AccessConsumer, status: 200 })
  googleLogin(@Body() body: GoogleLogin): Promise<AccessConsumer> {
    return this.service.googleLogin(body)
  }

  @Post(`signup`)
  signup(@Body() body: Signup): Promise<any> {
    return this.service.signup(body)
  }

  @Get(`confirm`)
  confirm(@Query(`token`) token: string, @Res() res: Response) {
    return this.service.confirm(token, res)
  }

  @Get(`/random-pass`)
  getRandomPassword(): Promise<string> {
    return this.service.getRandomPassword()
  }
}
