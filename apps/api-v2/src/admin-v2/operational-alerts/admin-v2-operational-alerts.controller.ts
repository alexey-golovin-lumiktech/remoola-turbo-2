import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Identity, type IIdentityContext, RequestMeta, type RequestMeta as RequestMetaPayload } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import {
  OperationalAlertCreateBody,
  OperationalAlertDeleteBody,
  OperationalAlertUpdateBody,
} from './admin-v2-operational-alerts.dto';
import { AdminV2OperationalAlertsService } from './admin-v2-operational-alerts.service';

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
    @Body() body: OperationalAlertCreateBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `alerts.manage`);
    return this.service.create(admin, body, meta);
  }

  @Patch(`:operationalAlertId`)
  async update(
    @Identity() admin: IIdentityContext,
    @Param(`operationalAlertId`) operationalAlertId: string,
    @Body() body: OperationalAlertUpdateBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `alerts.manage`);
    return this.service.update(admin, operationalAlertId, body, meta);
  }

  @Delete(`:operationalAlertId`)
  async delete(
    @Identity() admin: IIdentityContext,
    @Param(`operationalAlertId`) operationalAlertId: string,
    @Body() body: OperationalAlertDeleteBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `alerts.manage`);
    return this.service.delete(admin, operationalAlertId, body, meta);
  }
}
