import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { type AdminModel } from '@remoola/database-2';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { Identity } from '../common';
import { assertAdminV2Capability } from './admin-v2-access';

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2`)
@Controller(`admin-v2`)
export class AdminV2Controller {
  @Get(`me`)
  getMe(@Identity() admin: AdminModel) {
    const profile = assertAdminV2Capability(admin, `me.read`);
    return {
      id: admin.id,
      email: admin.email,
      type: admin.type,
      role: profile.role,
      phase: `MVP-1b`,
      capabilities: profile.capabilities,
      workspaces: profile.workspaces,
    };
  }
}
