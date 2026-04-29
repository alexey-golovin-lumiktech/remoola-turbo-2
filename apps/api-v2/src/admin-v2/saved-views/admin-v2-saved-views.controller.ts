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
import { SavedViewCreateBody, SavedViewDeleteBody, SavedViewUpdateBody } from './admin-v2-saved-views.dto';
import { AdminV2SavedViewsService } from './admin-v2-saved-views.service';

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
  async create(@Identity() admin: IIdentityContext, @Body() body: SavedViewCreateBody, @Req() req: express.Request) {
    await this.accessService.assertCapability(admin, `saved_views.manage`);
    return this.service.create(admin, body, requestMeta(req));
  }

  @Patch(`:savedViewId`)
  async update(
    @Identity() admin: IIdentityContext,
    @Param(`savedViewId`) savedViewId: string,
    @Body() body: SavedViewUpdateBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `saved_views.manage`);
    return this.service.update(admin, savedViewId, body, requestMeta(req));
  }

  @Delete(`:savedViewId`)
  async delete(
    @Identity() admin: IIdentityContext,
    @Param(`savedViewId`) savedViewId: string,
    @Body() body: SavedViewDeleteBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `saved_views.manage`);
    return this.service.delete(admin, savedViewId, body, requestMeta(req));
  }
}
