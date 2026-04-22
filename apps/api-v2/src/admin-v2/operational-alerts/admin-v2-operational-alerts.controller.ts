import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import express from 'express';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import {
  OperationalAlertCreateBodyDTO,
  OperationalAlertDeleteBodyDTO,
  OperationalAlertUpdateBodyDTO,
} from './admin-v2-operational-alerts.dto';
import { AdminV2OperationalAlertsService } from './admin-v2-operational-alerts.service';

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
@ApiTags(`Admin v2: Operational Alerts`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/operational-alerts`)
export class AdminV2OperationalAlertsController {
  constructor(
    private readonly service: AdminV2OperationalAlertsService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get()
  async list(@Identity() admin: IIdentityContext, @Query(`workspace`) workspace?: string) {
    await this.accessService.assertCapability(admin, `alerts.manage`);
    if (!workspace || typeof workspace !== `string`) {
      throw new BadRequestException(`workspace query parameter is required`);
    }
    return this.service.list(admin, workspace);
  }

  @Post()
  async create(
    @Identity() admin: IIdentityContext,
    @Body() body: OperationalAlertCreateBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `alerts.manage`);
    return this.service.create(admin, body, requestMeta(req));
  }

  @Patch(`:operationalAlertId`)
  async update(
    @Identity() admin: IIdentityContext,
    @Param(`operationalAlertId`) operationalAlertId: string,
    @Body() body: OperationalAlertUpdateBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `alerts.manage`);
    return this.service.update(admin, operationalAlertId, body, requestMeta(req));
  }

  @Delete(`:operationalAlertId`)
  async delete(
    @Identity() admin: IIdentityContext,
    @Param(`operationalAlertId`) operationalAlertId: string,
    @Body() body: OperationalAlertDeleteBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `alerts.manage`);
    return this.service.delete(admin, operationalAlertId, body, requestMeta(req));
  }
}
