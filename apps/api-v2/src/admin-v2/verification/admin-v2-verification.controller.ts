import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import express from 'express';

import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { optionalBooleanQuery, optionalNumberQuery, optionalStringQuery } from '../admin-v2-query-transforms';
import { AdminV2VerificationService } from './admin-v2-verification.service';

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

class VerificationQueueQuery {
  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  status?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  stripeIdentityStatus?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  country?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  contractorKind?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalBooleanQuery((obj as Record<string, unknown>)[key]))
  @IsBoolean()
  @IsOptional()
  missingProfileData?: boolean;

  @Expose()
  @Transform(({ obj, key }) => optionalBooleanQuery((obj as Record<string, unknown>)[key]))
  @IsBoolean()
  @IsOptional()
  missingDocuments?: boolean;
}

class VerificationDecisionBody {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  reason?: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;
}

@ApiCookieAuth()
@ApiTags(`Admin v2: Verification`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/verification`)
export class AdminV2VerificationController {
  constructor(
    private readonly service: AdminV2VerificationService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get(`queue`)
  @ApiQuery({ name: `page`, required: false, type: Number })
  @ApiQuery({ name: `pageSize`, required: false, type: Number })
  @ApiQuery({ name: `status`, required: false })
  @ApiQuery({ name: `stripeIdentityStatus`, required: false })
  @ApiQuery({ name: `country`, required: false })
  @ApiQuery({ name: `contractorKind`, required: false })
  @ApiQuery({ name: `missingProfileData`, required: false, type: Boolean })
  @ApiQuery({ name: `missingDocuments`, required: false, type: Boolean })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  async getQueue(@Identity() admin: IIdentityContext, @Query() query: VerificationQueueQuery) {
    await this.accessService.assertCapability(admin, `verification.read`);
    return this.service.getQueue({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      stripeIdentityStatus: query.stripeIdentityStatus,
      country: query.country,
      contractorKind: query.contractorKind,
      missingProfileData: query.missingProfileData === true,
      missingDocuments: query.missingDocuments === true,
    });
  }

  @Get(`:consumerId`)
  @ApiParam({ name: `consumerId`, format: `uuid`, description: `Consumer id` })
  @ApiBadRequestResponse({ description: `Invalid consumer id.` })
  async getCase(@Identity() admin: IIdentityContext, @Param(`consumerId`, ParseUUIDPipe) consumerId: string) {
    const profile = await this.accessService.assertCapability(admin, `verification.read`);
    const canManageAssignments = profile.capabilities.includes(`assignments.manage`);
    return this.service.getCase(consumerId, {
      canForceLogout: profile.capabilities.includes(`consumers.force_logout`),
      canDecide: profile.capabilities.includes(`verification.decide`),
      allowedActions: profile.capabilities.filter(
        (capability) => capability === `verification.decide` || capability === `consumers.force_logout`,
      ),
      canManageAssignments,
      canReassignAssignments: canManageAssignments && profile.role === `SUPER_ADMIN`,
    });
  }

  @Post(`:consumerId/approve`)
  @ApiParam({ name: `consumerId`, format: `uuid`, description: `Consumer id` })
  @ApiBadRequestResponse({ description: `Invalid consumer id or decision body.` })
  async approve(
    @Identity() admin: IIdentityContext,
    @Param(`consumerId`, ParseUUIDPipe) consumerId: string,
    @Body() body: VerificationDecisionBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `verification.decide`);
    return this.service.applyDecision(consumerId, admin.id, `approve`, body, requestMeta(req));
  }

  @Post(`:consumerId/reject`)
  @ApiParam({ name: `consumerId`, format: `uuid`, description: `Consumer id` })
  @ApiBadRequestResponse({ description: `Invalid consumer id or decision body.` })
  async reject(
    @Identity() admin: IIdentityContext,
    @Param(`consumerId`, ParseUUIDPipe) consumerId: string,
    @Body() body: VerificationDecisionBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `verification.decide`);
    return this.service.applyDecision(consumerId, admin.id, `reject`, body, requestMeta(req));
  }

  @Post(`:consumerId/request-info`)
  @ApiParam({ name: `consumerId`, format: `uuid`, description: `Consumer id` })
  @ApiBadRequestResponse({ description: `Invalid consumer id or decision body.` })
  async requestInfo(
    @Identity() admin: IIdentityContext,
    @Param(`consumerId`, ParseUUIDPipe) consumerId: string,
    @Body() body: VerificationDecisionBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `verification.decide`);
    return this.service.applyDecision(consumerId, admin.id, `request-info`, body, requestMeta(req));
  }

  @Post(`:consumerId/flag`)
  @ApiParam({ name: `consumerId`, format: `uuid`, description: `Consumer id` })
  @ApiBadRequestResponse({ description: `Invalid consumer id or decision body.` })
  async flag(
    @Identity() admin: IIdentityContext,
    @Param(`consumerId`, ParseUUIDPipe) consumerId: string,
    @Body() body: VerificationDecisionBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `verification.decide`);
    return this.service.applyDecision(consumerId, admin.id, `flag`, body, requestMeta(req));
  }
}
