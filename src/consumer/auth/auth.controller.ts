import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  InternalServerErrorException,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Response,
} from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { IncomingHttpHeaders } from 'http'

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
  @ApiOperation({ operationId: `consumer_auth_login` })
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  login(@ReqAuthIdentity() identity: IConsumerModel): Promise<CONSUMER.LoginResponse> {
    return this.service.login(identity)
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
    @Body() body: CONSUMER.PersonalDetailsCreate,
  ): Promise<CONSUMER.PersonalDetailsResponse | never> {
    return this.personalDetailsService.upsert(consumerId, body)
  }

  @PublicEndpoint()
  @Post(`/:consumerId/organization-details`)
  signupOrganizationDetails(
    @Param(`consumerId`) consumerId: string,
    @Body() body: CONSUMER.OrganizationDetailsCreate,
  ): Promise<CONSUMER.OrganizationDetailsResponse | never> {
    return this.organizationDetailsService.upsert(consumerId, body)
  }

  @PublicEndpoint()
  @Post(`/:consumerId/address-details`)
  signupAddressDetails(
    @Param(`consumerId`) consumerId: string,
    @Body() body: CONSUMER.AddressDetailsCreate,
  ): Promise<CONSUMER.AddressDetailsResponse | never> {
    return this.addressDetailsService.upsert(consumerId, body)
  }

  @PublicEndpoint()
  @Get(`/:consumerId/complete-profile-creation`)
  completeProfileCreation(@Headers() headers: IncomingHttpHeaders, @Param(`consumerId`) consumerId: string): Promise<void | never> {
    const referer = headers.origin || headers.referer
    if (!referer) throw new InternalServerErrorException(`Unexpected referer(origin): ${referer}`)
    return this.service.completeProfileCreation(consumerId, referer)
  }

  @PublicEndpoint()
  @Get(`/signup/verification`)
  signupVerification(@Query(`referer`) referer: string, @Query(`token`) token: string, @Response() res: express.Response) {
    if (!referer) throw new InternalServerErrorException(`Unexpected referer(origin): ${referer}`)
    return this.service.signupVerification(token, res, referer)
  }

  @PublicEndpoint()
  @Post(`/change-password`)
  checkEmailAndSendRecoveryLink(@Headers() headers: IncomingHttpHeaders, @Body() body: { email: string }): Promise<void> {
    const referer = headers.origin || headers.referer
    if (!referer) throw new InternalServerErrorException(`Unexpected referer(origin): ${referer}`)
    return this.service.checkEmailAndSendRecoveryLink(body, referer)
  }

  @PublicEndpoint()
  @Patch(`/change-password/:token`)
  changePassword(@Param() param: CONSUMER.ChangePasswordParam, @Body() body: CONSUMER.ChangePasswordBody) {
    return this.service.changePassword(body, param)
  }
}
