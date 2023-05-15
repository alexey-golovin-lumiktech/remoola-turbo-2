import { Body, Controller, Get, Inject, Logger, Post, Query, Res } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'

import { AuthService } from './auth.service'

import { PublicEndpoint } from 'src/decorators'
import { Signup } from 'src/dtos'
import { GoogleSignin, SigninResponse } from 'src/dtos/consumer'
import { ReqAuthIdentity } from 'src/guards/auth.guard'
import { TransformResponse } from 'src/interceptors/response.interceptor'
import { IConsumerModel } from 'src/models'

@ApiTags(`consumer`)
@Controller(`consumer/auth`)
export class AuthController {
  logger = new Logger(AuthController.name)

  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post(`/signin`)
  @ApiOkResponse({ type: SigninResponse })
  @TransformResponse(SigninResponse)
  signin(@ReqAuthIdentity() identity: IConsumerModel): Promise<SigninResponse> {
    return this.service.signin(identity)
  }

  @PublicEndpoint()
  @Post(`/google-signin`)
  @ApiOkResponse({ type: SigninResponse })
  @TransformResponse(SigninResponse)
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
