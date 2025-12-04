import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, IIdentity } from '../../common';

@ApiTags(`Consumer: Profile`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`profile`)
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor() {}

  @Get(`me`)
  async getMe(@Identity() identity: IIdentity) {
    return identity;
  }
}
