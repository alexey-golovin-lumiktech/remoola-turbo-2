import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  consumerPasswordChangeResponseSchema,
  consumerProfileResponseSchema,
  type ConsumerPasswordChangeResponse,
  type ConsumerProfileResponse,
} from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerProfileService } from './consumer-profile.service';
import { ChangePasswordBody, UpdateConsumerProfileBody } from './dtos';
import { Identity } from '../../../common';
import { toConsumerWireContract } from '../../consumer-wire-contract';

@ApiTags(`Consumer: Profile`)
@Controller(`consumer/profile`)
export class ConsumerProfileController {
  constructor(private readonly service: ConsumerProfileService) {}

  @Get()
  async getProfile(@Identity() consumer: ConsumerModel): Promise<ConsumerProfileResponse> {
    return toConsumerWireContract(consumerProfileResponseSchema, await this.service.getProfile(consumer.id));
  }

  @Get(`me`)
  async getMe(@Identity() consumer: ConsumerModel): Promise<ConsumerProfileResponse> {
    return toConsumerWireContract(consumerProfileResponseSchema, await this.service.getProfile(consumer.id));
  }

  @Patch()
  async patchProfile(
    @Identity() consumer: ConsumerModel,
    @Body() body: UpdateConsumerProfileBody,
  ): Promise<ConsumerProfileResponse> {
    return toConsumerWireContract(consumerProfileResponseSchema, await this.service.updateProfile(consumer.id, body));
  }

  @Patch(`update`)
  async updateProfile(
    @Identity() consumer: ConsumerModel,
    @Body() body: UpdateConsumerProfileBody,
  ): Promise<ConsumerProfileResponse> {
    return toConsumerWireContract(consumerProfileResponseSchema, await this.service.updateProfile(consumer.id, body));
  }

  @Patch(`password`)
  async changePassword(
    @Identity() consumer: ConsumerModel,
    @Body() body: ChangePasswordBody,
  ): Promise<ConsumerPasswordChangeResponse> {
    await this.service.changePassword(consumer.id, body);
    return toConsumerWireContract(consumerPasswordChangeResponseSchema, { success: true, requiresReauth: true });
  }
}
