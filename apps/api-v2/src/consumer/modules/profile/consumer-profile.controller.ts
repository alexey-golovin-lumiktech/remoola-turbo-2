import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerProfileService } from './consumer-profile.service';
import { ChangePasswordBody, UpdateConsumerProfileBody } from './dtos';
import { Identity } from '../../../common';

@ApiTags(`Consumer: Profile`)
@Controller(`consumer/profile`)
export class ConsumerProfileController {
  constructor(private readonly service: ConsumerProfileService) {}

  @Get()
  getProfile(@Identity() consumer: ConsumerModel) {
    return this.service.getProfile(consumer.id);
  }

  @Get(`me`)
  getMe(@Identity() consumer: ConsumerModel) {
    return this.service.getProfile(consumer.id);
  }

  @Patch()
  async patchProfile(@Identity() consumer: ConsumerModel, @Body() body: UpdateConsumerProfileBody) {
    return this.service.updateProfile(consumer.id, body);
  }

  @Patch(`update`)
  async updateProfile(@Identity() consumer: ConsumerModel, @Body() body: UpdateConsumerProfileBody) {
    return this.service.updateProfile(consumer.id, body);
  }

  @Patch(`password`)
  async changePassword(@Identity() consumer: ConsumerModel, @Body() body: ChangePasswordBody) {
    await this.service.changePassword(consumer.id, body);
    return { success: true, requiresReauth: true };
  }
}
