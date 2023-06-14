import { Body, Controller, Get, Inject, Logger, Param, Post, Query, Res } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { PublicEndpoint } from '../../decorators'
import { CONSUMER } from '../../dtos'
import { ReqAuthIdentity } from '../../guards/auth.guard'
import { TransformResponse } from '../../interceptors/response.interceptor'
import { IConsumerModel } from '../../models'
import { AddressDetailsService } from '../entities/address-details/address-details.service'
import { OrganizationDetailsService } from '../entities/organization-details/organization-details.service'
import { PersonalDetailsService } from '../entities/personal-details/personal-details.service'

import { AuthService } from './auth.service'

@ApiTags(`consumer`)
@Controller(`consumer/auth`)
export class AuthController {
  logger = new Logger(AuthController.name)

  constructor(
    @Inject(AuthService) private readonly service: AuthService,
    @Inject(PersonalDetailsService) private personalDetailsService: PersonalDetailsService,
    @Inject(OrganizationDetailsService) private organizationDetailsService: OrganizationDetailsService,
    @Inject(AddressDetailsService) private addressDetailsService: AddressDetailsService,
  ) {}

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
    return this.service.signup(body)
  }

  @PublicEndpoint()
  @Post(`/signup/:consumerId/personal-details`)
  signupPersonalDetails(@Param() consumerId: string, @Body() body: CONSUMER.PersonalDetails): Promise<void | never> {
    return this.personalDetailsService.upsertPersonalDetails(consumerId, body)
  }

  @PublicEndpoint()
  @Post(`/signup/:consumerId/organization-details`)
  signupOrganizationDetails(@Param() consumerId: string, @Body() body: CONSUMER.OrganizationDetails): Promise<void | never> {
    return this.organizationDetailsService.upsertOrganizationDetails(consumerId, body)
  }

  @PublicEndpoint()
  @Post(`/signup/:consumerId/address-details`)
  signupAddressDetails(@Param() consumerId: string, @Body() body: CONSUMER.AddressDetails): Promise<void | never> {
    return this.addressDetailsService.upsertAddressDetails(consumerId, body)
  }

  @PublicEndpoint()
  @Get(`/signup/verification`)
  signupCompletion(@Query(`token`) token: string, @Res() res: IExpressResponse) {
    return this.service.signupCompletion(token, res)
  }
}
