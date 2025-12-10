import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ConsumerModel } from '@remoola/database-2';

import { ConsumerProfileService } from './consumer-profile.service';
import { UpdateConsumerPasswordBody, UpdateConsumerProfileBody } from './dtos';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@ApiTags(`Consumer: Profile`)
@UseGuards(JwtAuthGuard)
@Controller(`consumer/profile`)
export class ConsumerProfileController {
  constructor(private readonly service: ConsumerProfileService) {}

  @Get(`me`)
  getMe(@Identity() identity: ConsumerModel) {
    return this.service.getProfile(identity.id);
  }

  @Patch(`update`)
  async updateProfile(@Identity() identity: ConsumerModel, @Body() body: UpdateConsumerProfileBody) {
    return this.service.updateProfile(identity.id, body);
  }

  @Patch(`password`)
  async changePassword(@Identity() identity: ConsumerModel, @Body() body: UpdateConsumerPasswordBody) {
    return this.service.changePassword(identity.id, body);
  }
}
