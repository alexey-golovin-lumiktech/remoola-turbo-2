import { Body, Controller, Get, Inject, Logger, Post, Query, Res } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'

import { PublicEndpoint } from '../../decorators'
import { Credentials, Signup } from '../../dtos'
import { GoogleSignin, SigninResponse } from '../../dtos/consumer'

import { AuthService } from './auth.service'

import { Identity } from 'src/guards/auth.guard'

@ApiTags(`consumers`)
@Controller(`consumers/auth`)
export class AuthController {
  logger = new Logger(AuthController.name)

  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post(`/signin`)
  @ApiOkResponse({ type: SigninResponse, status: 200 })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  signin(@Body() body: Credentials, @Identity() _identity: unknown): Promise<SigninResponse> {
    return this.service.signin(body)
  }

  @Post(`/google-signin`)
  @ApiOkResponse({ type: SigninResponse, status: 200 })
  googleSignin(@Body() body: GoogleSignin): Promise<SigninResponse> {
    return this.service.googleSignin(body)
  }

  @PublicEndpoint()
  @Post(`/signup`)
  signup(@Body() body: Signup): Promise<void | never> {
    return this.service.signup(body)
  }

  @PublicEndpoint()
  @Get(`/signup/verification`)
  signupCompletion(@Query(`token`) token: string, @Res() res: Response) {
    return this.service.signupCompletion(token, res)
  }
}
