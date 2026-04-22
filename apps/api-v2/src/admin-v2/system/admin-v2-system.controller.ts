import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2SystemService } from './admin-v2-system.service';

@UseGuards(JwtAuthGuard)
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
  async getSummary(@Identity() admin: IIdentityContext) {
    await this.accessService.assertCapability(admin, `system.read`);
    return this.service.getSummary();
  }
}
