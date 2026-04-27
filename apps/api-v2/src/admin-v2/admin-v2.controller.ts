import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../common';
import { AdminV2AccessService } from './admin-v2-access.service';

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2`)
export class AdminV2Controller {
  constructor(private readonly accessService: AdminV2AccessService) {}

  @Get(`me`)
  async getMe(@Identity() admin: IIdentityContext) {
    const profile = await this.accessService.assertCapability(admin, `me.read`);
    return {
      id: admin.id,
      email: admin.email,
      type: admin.type,
      role: profile.role,
      source: profile.source,
      bootstrapReason: profile.bootstrapReason ?? null,
      phase: `MVP-3 system maturity kickoff`,
      capabilities: profile.capabilities,
      workspaces: profile.workspaces,
    };
  }
}
