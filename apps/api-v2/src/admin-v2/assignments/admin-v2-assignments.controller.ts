import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import express from 'express';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import {
  AssignmentClaimBodyDTO,
  AssignmentReassignBodyDTO,
  AssignmentReleaseBodyDTO,
} from './admin-v2-assignments.dto';
import { AdminV2AssignmentsService } from './admin-v2-assignments.service';

function requestMeta(req: express.Request) {
  const ipAddress = req.ip ?? req.headers[`x-forwarded-for`];
  const userAgent = req.headers[`user-agent`];
  const idempotencyKey = req.headers[`idempotency-key`];
  return {
    ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
    userAgent: typeof userAgent === `string` ? userAgent : null,
    idempotencyKey:
      typeof idempotencyKey === `string` ? idempotencyKey : Array.isArray(idempotencyKey) ? idempotencyKey[0] : null,
  };
}

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Assignments`)
@Controller(`admin-v2/assignments`)
export class AdminV2AssignmentsController {
  constructor(
    private readonly service: AdminV2AssignmentsService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Post(`claim`)
  async claim(@Identity() admin: IIdentityContext, @Body() body: AssignmentClaimBodyDTO, @Req() req: express.Request) {
    await this.accessService.assertCapability(admin, `assignments.manage`);
    return this.service.claim(admin, body, requestMeta(req));
  }

  @Post(`release`)
  async release(
    @Identity() admin: IIdentityContext,
    @Body() body: AssignmentReleaseBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `assignments.manage`);
    return this.service.release(admin, body, requestMeta(req));
  }

  @Post(`reassign`)
  async reassign(
    @Identity() admin: IIdentityContext,
    @Body() body: AssignmentReassignBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `assignments.manage`);
    return this.service.reassign(admin, body, requestMeta(req));
  }
}
