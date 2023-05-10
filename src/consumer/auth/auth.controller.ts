import { Body, Controller, Get, Inject, Logger, Post, Query, Res } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'

import { Credentials, Signup } from '../../dtos'
import { AccessConsumer, ConsumerGoogleSignin } from '../../dtos/consumer'

import { AuthService } from './auth.service'

@ApiTags(`consumer`)
@Controller(`consumer/auth`)
export class AuthController {
  logger = new Logger(AuthController.name)

  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post(`/signin`)
  @ApiOkResponse({ type: AccessConsumer, status: 200 })
  signin(@Body() body: Credentials): Promise<AccessConsumer> {
    return this.service.signin(body)
  }

  @Post(`/google-signin`)
  @ApiOkResponse({ type: AccessConsumer, status: 200 })
  googleSignin(@Body() body: ConsumerGoogleSignin): Promise<AccessConsumer> {
    return this.service.googleSignin(body)
  }

  @Post(`/signup`)
  signup(@Body() body: Signup): Promise<void | never> {
    return this.service.signup(body)
  }

  @Get(`/signup/verification`)
  signupCompletion(@Query(`token`) token: string, @Res() res: Response) {
    return this.service.signupCompletion(token, res)
  }

  @Get(`/random-pass`)
  getRandomPassword(): Promise<string> {
    return this.service.getRandomPassword()
  }
}
