import { Body, Controller, Get, Inject, Logger, Post, Query, Res } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { PublicEndpoint } from '../../decorators'
import { CONSUMER } from '../../dtos'
import { ReqAuthIdentity } from '../../guards/auth.guard'
import { TransformResponse } from '../../interceptors/response.interceptor'
import { IConsumerModel } from '../../models'

import { AuthService } from './auth.service'

@ApiTags(`consumer`)
@Controller(`consumer/auth`)
export class AuthController {
  logger = new Logger(AuthController.name)

  constructor(@Inject(AuthService) private readonly service: AuthService) {}

  @Post(`/signin`)
  @ApiOkResponse({ type: CONSUMER.SigninResponse })
  @TransformResponse(CONSUMER.SigninResponse)
  signin(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.SigninResponse> {
    return this.service.signin(identity)
  }

  @PublicEndpoint()
  @Post(`/google-signin`)
  @ApiOkResponse({ type: CONSUMER.SigninResponse })
  @TransformResponse(CONSUMER.SigninResponse)
  googleSignin(@Body() body: CONSUMER.GoogleSignin): Promise<CONSUMER.SigninResponse> {
    return this.service.googleSignin(body)
  }

  @PublicEndpoint()
  @Post(`/signup`)
  signup(@Body() body: CONSUMER.SignupRequest): Promise<void | never> {
    console.log(JSON.stringify({ body }, null, 2))
    return this.service.signup(body)
  }

  @PublicEndpoint()
  @Get(`/signup/verification`)
  signupCompletion(@Query(`token`) token: string, @Res() res: IExpressResponse) {
    return this.service.signupCompletion(token, res)
  }
}
