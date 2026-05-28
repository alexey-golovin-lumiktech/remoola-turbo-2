import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { type AdminV2SystemSummaryResponse } from '@remoola/api-types';

import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2SystemService } from './admin-v2-system.service';

@ApiCookieAuth()
@ApiTags(`Admin v2: System`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/system`)
export class AdminV2SystemController {
  constructor(
    private readonly service: AdminV2SystemService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get(`summary`)
  async getSummary(@Identity() admin: IIdentityContext): Promise<AdminV2SystemSummaryResponse> {
    await this.accessService.assertCapability(admin, `system.read`);
    return this.service.getSummary();
  }
}
