import { IncomingHttpHeaders } from 'http';

import {
  Body,
  Controller,
  Get,
  Headers,
  InternalServerErrorException,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Response,
} from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiBody, ApiTags, ApiBasicAuth, ApiBearerAuth } from '@nestjs/swagger';
import express from 'express';
import _ from 'lodash';

import {
  IAddressDetailsModel,
  IConsumerModel,
  IOrganizationDetailsModel,
  IPersonalDetailsModel,
} from '@remoola/database';

import { ConsumerAuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { Identity, PublicEndpoint } from '../../common';
import { CONSUMER } from '../../dtos';
import { TransformResponse } from '../../interceptors';
import { PrismaService } from '../../shared/prisma.service';

@ApiTags(`Consumer: Auth`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller()
export class ConsumerAuthController {
  private readonly logger = new Logger(ConsumerAuthController.name);

  constructor(
    private readonly service: ConsumerAuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(`login`)
  @ApiOperation({ operationId: `consumer_auth_login` })
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  login(@Identity() identity: IConsumerModel) {
    return this.service.login(identity);
  }

  @PublicEndpoint()
  @Get(`google-new-way`)
  @ApiOkResponse({ type: CONSUMER.GoogleOAuthNewWayResponse })
  @TransformResponse(CONSUMER.GoogleOAuthNewWayResponse)
  googleOAuthNewWay(@Query() query: CONSUMER.GoogleOAuth2Query) {
    return this.googleAuthService.googleOAuthNewWay(query);
  }

  @PublicEndpoint()
  @Get(`google-redirect-new-way`)
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  async googleOAuthNewWayRedirect(
    @Response() response: express.Response,
    @Query() query: CONSUMER.RedirectCallbackQuery,
  ) {
    const queryStateHref = _.get(query, `state.href`, null);
    if (queryStateHref == null) {
      this.logger.debug({ caller: this.googleOAuthNewWayRedirect.name, payload: { queryStateHref, query } });
      return;
    }
    if (query?.error == null) await this.googleAuthService.googleOAuthNewWayRedirect(query);
    const url = new URL(queryStateHref);
    return response.status(301).redirect(url.origin + `/create-profile`);
  }

  @PublicEndpoint()
  @Post(`google-oauth`)
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  googleOAuth(@Body() body: CONSUMER.GoogleSignin) {
    return this.service.googleOAuth(body);
  }

  @PublicEndpoint()
  @Post(`signup`)
  @TransformResponse(CONSUMER.ConsumerResponse)
  signup(@Body() body: CONSUMER.SignupRequest) {
    return this.service.signup(body);
  }

  @PublicEndpoint()
  @Post(`refresh-access`)
  @ApiOperation({ operationId: `refresh_access` })
  @ApiBody({ schema: { type: `object`, properties: { refreshToken: { type: `string` } } } })
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  refreshAccess(@Body(`refreshToken`) refreshToken: string) {
    return this.service.refreshAccess(refreshToken);
  }

  @PublicEndpoint()
  @Post(`:consumerId/personal-details`)
  async signupPersonalDetails(@Param(`consumerId`) consumerId: string, @Body() body: CONSUMER.PersonalDetailsCreate) {
    const found = await this.prisma.personalDetails.findFirst({ where: { consumerId } });
    let personalDetails: IPersonalDetailsModel;

    if (!found) {
      personalDetails = await this.prisma.personalDetails.create({
        data: { consumer: { connect: { id: consumerId } }, ...body },
      });
    } else {
      personalDetails = await this.prisma.personalDetails.update({
        where: { id: found.id },
        data: body,
      });
    }

    return personalDetails;
  }

  @PublicEndpoint()
  @Post(`:consumerId/organization-details`)
  async signupOrganizationDetails(
    @Param(`consumerId`) consumerId: string,
    @Body() body: CONSUMER.OrganizationDetailsCreate,
  ) {
    const found = await this.prisma.personalDetails.findFirst({ where: { consumerId } });

    let organizationDetails: IOrganizationDetailsModel;
    if (!found) {
      organizationDetails = await this.prisma.organizationDetails.create({
        data: { consumer: { connect: { id: consumerId } }, ...body },
      });
    } else {
      organizationDetails = await this.prisma.organizationDetails.update({
        where: { id: found.id },
        data: body,
      });
    }

    return organizationDetails;
  }

  @PublicEndpoint()
  @Post(`:consumerId/address-details`)
  async signupAddressDetails(@Param(`consumerId`) consumerId: string, @Body() body: CONSUMER.AddressDetailsCreate) {
    const found = await this.prisma.personalDetails.findFirst({ where: { consumerId } });

    let addressDetails: IAddressDetailsModel;
    if (!found) {
      addressDetails = await this.prisma.addressDetails.create({
        data: { consumer: { connect: { id: consumerId } }, ...body },
      });
    } else {
      addressDetails = await this.prisma.addressDetails.update({
        where: { id: found.id },
        data: body,
      });
    }

    return addressDetails;
  }

  @PublicEndpoint()
  @Get(`:consumerId/complete-profile-creation`)
  completeProfileCreation(@Headers() headers: IncomingHttpHeaders, @Param(`consumerId`) consumerId: string) {
    const referer = headers.origin || headers.referer;
    if (!referer) throw new InternalServerErrorException(`Unexpected referer(origin): ${referer}`);
    return this.service.completeProfileCreation(consumerId, referer);
  }

  @PublicEndpoint()
  @Get(`signup/verification`)
  signupVerification(
    @Query(`referer`) referer: string,
    @Query(`token`) token: string,
    @Response() res: express.Response,
  ) {
    if (!referer) throw new InternalServerErrorException(`Unexpected referer(origin): ${referer}`);
    return this.service.signupVerification(token, res, referer);
  }

  @PublicEndpoint()
  @Post(`change-password`)
  checkEmailAndSendRecoveryLink(@Headers() headers: IncomingHttpHeaders, @Body() body: { email: string }) {
    const referer = headers.origin || headers.referer;
    if (!referer) throw new InternalServerErrorException(`Unexpected referer(origin): ${referer}`);
    return this.service.checkEmailAndSendRecoveryLink(body, referer);
  }

  @PublicEndpoint()
  @Patch(`change-password/:token`)
  changePassword(@Param() param: CONSUMER.ChangePasswordParam, @Body() body: CONSUMER.ChangePasswordBody) {
    return this.service.changePassword(body, param);
  }
}
