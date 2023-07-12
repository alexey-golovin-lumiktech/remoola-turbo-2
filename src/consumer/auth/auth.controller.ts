import { Body, Controller, Get, Inject, Logger, Param, Post, Query, Res } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { PublicEndpoint } from '../../decorators'
import { CONSUMER } from '../../dtos'
import { ReqAuthIdentity } from '../../guards/auth.guard'
import { TransformResponse } from '../../interceptors'
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

  @Post(`/login`)
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  login(@ReqAuthIdentity() consumerIdentity: IConsumerModel): Promise<CONSUMER.LoginResponse> {
    return this.service.login(consumerIdentity)
  }

  @PublicEndpoint()
  @Post(`/google-oauth`)
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  googleOAuth(@Body() body: CONSUMER.GoogleSignin): Promise<CONSUMER.LoginResponse> {
    return this.service.googleOAuth(body)
  }

  @PublicEndpoint()
  @Post(`/signup`)
  signup(@Body() body: CONSUMER.SignupRequest): Promise<CONSUMER.ConsumerResponse | never> {
    return this.service.signup(body)
  }

  @PublicEndpoint()
  @Post(`/:consumerId/personal-details`)
  signupPersonalDetails(
    @Param(`consumerId`) consumerId: string,
    @Body() body: CONSUMER.CreatePersonalDetails,
  ): Promise<CONSUMER.PersonalDetailsResponse | never> {
    return this.personalDetailsService.upsert({ ...body, consumerId })
  }

  @PublicEndpoint()
  @Post(`/:consumerId/organization-details`)
  signupOrganizationDetails(
    @Param(`consumerId`) consumerId: string,
    @Body() body: CONSUMER.CreateOrganizationDetails,
  ): Promise<CONSUMER.OrganizationDetailsResponse | never> {
    return this.organizationDetailsService.upsert({ ...body, consumerId })
  }

  @PublicEndpoint()
  @Post(`/:consumerId/address-details`)
  signupAddressDetails(
    @Param(`consumerId`) consumerId: string,
    @Body() body: CONSUMER.CreateAddressDetails,
  ): Promise<CONSUMER.AddressDetailsResponse | never> {
    return this.addressDetailsService.upsert({ ...body, consumerId })
  }

  @PublicEndpoint()
  @Get(`/:consumerId/complete-profile-creation`)
  completeProfileCreation(@Param(`consumerId`) consumerId: string): Promise<void | never> {
    return this.service.completeProfileCreation(consumerId)
  }

  @PublicEndpoint()
  @Get(`/signup/verification`)
  signupVerification(@Query(`token`) token: string, @Res() res: IExpressResponse) {
    return this.service.signupVerification(token, res)
  }
}
