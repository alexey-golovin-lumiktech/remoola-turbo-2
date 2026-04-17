import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2OverviewService } from './admin-v2-overview.service';

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Overview`)
@Controller(`admin-v2/overview`)
export class AdminV2OverviewController {
  constructor(
    private readonly service: AdminV2OverviewService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get(`summary`)
  async getSummary(@Identity() admin: IIdentityContext) {
    await this.accessService.assertCapability(admin, `overview.read`);
    return this.service.getSummary();
  }
}
