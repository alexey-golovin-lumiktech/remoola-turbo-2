import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Identity, type IIdentityContext, RequestMeta, type RequestMeta as RequestMetaPayload } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { SavedViewCreateBody, SavedViewDeleteBody, SavedViewUpdateBody } from './admin-v2-saved-views.dto';
import { AdminV2SavedViewsService } from './admin-v2-saved-views.service';

@ApiCookieAuth()
@ApiTags(`Admin v2: Saved Views`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/saved-views`)
export class AdminV2SavedViewsController {
  constructor(
    private readonly service: AdminV2SavedViewsService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get()
  async list(@Identity() admin: IIdentityContext, @Query(`workspace`) workspace?: string) {
    await this.accessService.assertCapability(admin, `saved_views.manage`);
    if (!workspace || typeof workspace !== `string`) {
      throw new BadRequestException(`workspace query parameter is required`);
    }
    return this.service.list(admin, workspace);
  }

  @Post()
  async create(
    @Identity() admin: IIdentityContext,
    @Body() body: SavedViewCreateBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `saved_views.manage`);
    return this.service.create(admin, body, meta);
  }

  @Patch(`:savedViewId`)
  async update(
    @Identity() admin: IIdentityContext,
    @Param(`savedViewId`) savedViewId: string,
    @Body() body: SavedViewUpdateBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `saved_views.manage`);
    return this.service.update(admin, savedViewId, body, meta);
  }

  @Delete(`:savedViewId`)
  async delete(
    @Identity() admin: IIdentityContext,
    @Param(`savedViewId`) savedViewId: string,
    @Body() body: SavedViewDeleteBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `saved_views.manage`);
    return this.service.delete(admin, savedViewId, body, meta);
  }
}
