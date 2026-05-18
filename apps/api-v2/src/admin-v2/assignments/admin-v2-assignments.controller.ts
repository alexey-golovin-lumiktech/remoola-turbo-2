import { Body, Controller, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Identity, type IIdentityContext, RequestMeta, type RequestMeta as RequestMetaPayload } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AssignmentClaimBody, AssignmentReassignBody, AssignmentReleaseBody } from './admin-v2-assignments.dto';
import { AdminV2AssignmentsService } from './admin-v2-assignments.service';

@ApiCookieAuth()
@ApiTags(`Admin v2: Assignments`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/assignments`)
export class AdminV2AssignmentsController {
  constructor(
    private readonly service: AdminV2AssignmentsService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Post(`claim`)
  async claim(
    @Identity() admin: IIdentityContext,
    @Body() body: AssignmentClaimBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `assignments.manage`);
    return this.service.claim(admin, body, meta);
  }

  @Post(`release`)
  async release(
    @Identity() admin: IIdentityContext,
    @Body() body: AssignmentReleaseBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `assignments.manage`);
    return this.service.release(admin, body, meta);
  }

  @Post(`reassign`)
  async reassign(
    @Identity() admin: IIdentityContext,
    @Body() body: AssignmentReassignBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `assignments.manage`);
    return this.service.reassign(admin, body, meta);
  }
}
