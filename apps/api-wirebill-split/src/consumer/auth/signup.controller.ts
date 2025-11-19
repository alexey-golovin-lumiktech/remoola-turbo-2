import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth, ApiOkResponse } from '@nestjs/swagger';
import express from 'express';

import { ConsumerSignupServiceGPT } from './consumer-signup.service';
import {
  AddressDetailsUpsert,
  AddressDetailsUpsertOkResponse,
  OrganizationDetailsUpsert,
  OrganizationDetailsUpsertOkResponse,
  PersonalDetailsUpsert,
  PersonalDetailsUpsertOkResponse,
  SignupBody,
} from './dto';
import { SignupService } from './signup.service';
import { PublicEndpoint } from '../../common';
import { removeNil } from '../../shared-common';
import { ConsumerSignupGPT } from './dto/consumer-signup.dto';

@ApiTags(`Consumer: Signup`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`signup`)
export class ConsumerSignupController {
  constructor(
    private readonly service: SignupService,
    private readonly signupServiceGPT: ConsumerSignupServiceGPT,
  ) {}

  @PublicEndpoint()
  @Post(`signup-gpt`)
  @HttpCode(HttpStatus.CREATED)
  async signupGPT(@Body() body: ConsumerSignupGPT) {
    console.log(`\n************************************`);
    console.log(`body`, body);
    console.log(`************************************\n`);
    const consumer = await this.signupServiceGPT.signupGPT(removeNil(body));
    return { consumer };
  }

  @PublicEndpoint()
  @Post()
  signup(@Body() body: SignupBody) {
    return this.service.signup(removeNil(body));
  }

  @PublicEndpoint()
  @Post(`:consumerId/personal-details`)
  @ApiOkResponse({ type: PersonalDetailsUpsertOkResponse })
  personalDetails(@Param(`consumerId`) consumerId: string, @Body() body: PersonalDetailsUpsert) {
    return this.service.personalDetails(consumerId, removeNil(body));
  }

  @PublicEndpoint()
  @Post(`:consumerId/address-details`)
  @ApiOkResponse({ type: AddressDetailsUpsertOkResponse })
  addressDetails(@Param(`consumerId`) consumerId: string, @Body() body: AddressDetailsUpsert) {
    return this.service.addressDetails(consumerId, removeNil(body));
  }

  @PublicEndpoint()
  @Post(`:consumerId/organization-details`)
  @ApiOkResponse({ type: OrganizationDetailsUpsertOkResponse })
  organizationDetails(@Param(`consumerId`) consumerId: string, @Body() body: OrganizationDetailsUpsert) {
    return this.service.organizationDetails(consumerId, removeNil(body));
  }

  @PublicEndpoint()
  @Get(`/:consumerId/complete-profile-creation`)
  completeProfileCreation(@Req() req: express.Request, @Param(`consumerId`) consumerId: string) {
    const referer = req.headers.origin || req.headers.referer;
    if (!referer) throw new InternalServerErrorException(`Unexpected referer(origin): ${referer}`);
    this.service.completeProfileCreation(consumerId, referer);
    return `success`;
  }
}
