import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { type AdminModel } from '@remoola/database-2';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity } from '../../common';
import { assertAdminV2Capability } from '../admin-v2-access';
import { AdminV2OverviewService } from './admin-v2-overview.service';

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Overview`)
@Controller(`admin-v2/overview`)
export class AdminV2OverviewController {
  constructor(private readonly service: AdminV2OverviewService) {}

  @Get(`summary`)
  getSummary(@Identity() admin: AdminModel) {
    assertAdminV2Capability(admin, `overview.read`);
    return this.service.getSummary();
  }
}
