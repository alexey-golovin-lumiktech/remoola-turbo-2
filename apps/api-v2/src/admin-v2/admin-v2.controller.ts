import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { type AdminV2AdminIdentity } from '@remoola/api-types';

import { Identity, type IIdentityContext } from '../common';
import { AdminV2AccessService } from './admin-v2-access.service';

@ApiCookieAuth()
@ApiTags(`Admin v2`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2`)
export class AdminV2Controller {
  constructor(private readonly accessService: AdminV2AccessService) {}

  @Get(`me`)
  async getMe(@Identity() admin: IIdentityContext): Promise<AdminV2AdminIdentity> {
    const profile = await this.accessService.assertCapability(admin, `me.read`);
    return {
      id: admin.id,
      email: admin.email,
      type: admin.type,
      role: profile.role,
      source: profile.source,
      bootstrapReason: profile.bootstrapReason ?? null,
      accessMode: profile.accessMode,
      featureMaturity: profile.featureMaturity,
      phase:
        profile.featureMaturity === `selective-operator-platform` ? `Selective operator platform` : `Workspace access`,
      capabilities: profile.capabilities,
      workspaces: profile.workspaces,
    };
  }
}
