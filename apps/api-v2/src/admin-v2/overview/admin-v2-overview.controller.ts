import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { type AdminV2OverviewSummaryResponse } from '@remoola/api-types';

import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2OverviewService } from './admin-v2-overview.service';

@ApiCookieAuth()
@ApiTags(`Admin v2: Overview`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/overview`)
export class AdminV2OverviewController {
  constructor(
    private readonly service: AdminV2OverviewService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get(`summary`)
  async getSummary(@Identity() admin: IIdentityContext): Promise<AdminV2OverviewSummaryResponse> {
    await this.accessService.assertCapability(admin, `overview.read`);
    return this.service.getSummary();
  }
}
