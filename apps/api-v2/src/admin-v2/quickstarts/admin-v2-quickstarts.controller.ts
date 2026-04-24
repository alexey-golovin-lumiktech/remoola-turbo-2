import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { isQuickstartId, isQuickstartSurface, type QuickstartSurface } from './admin-v2-quickstarts.dto';
import { AdminV2QuickstartsService } from './admin-v2-quickstarts.service';

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Quickstarts`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/quickstarts`)
export class AdminV2QuickstartsController {
  constructor(
    private readonly service: AdminV2QuickstartsService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get()
  async list(@Identity() admin: IIdentityContext, @Query(`surface`) surface?: string) {
    await this.accessService.assertCapability(admin, `me.read`);
    let requestedSurface: QuickstartSurface = `all`;
    if (surface) {
      if (!isQuickstartSurface(surface)) {
        throw new BadRequestException(`Unknown quickstart surface`);
      }
      requestedSurface = surface;
    }
    return {
      items: this.service.list(requestedSurface),
    };
  }

  @Get(`:quickstartId`)
  async get(@Identity() admin: IIdentityContext, @Param(`quickstartId`) quickstartId: string) {
    await this.accessService.assertCapability(admin, `me.read`);
    if (!isQuickstartId(quickstartId)) {
      throw new BadRequestException(`Unknown quickstart id`);
    }
    return this.service.get(quickstartId);
  }
}
