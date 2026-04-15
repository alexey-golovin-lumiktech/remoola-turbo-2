import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import express from 'express';

import { type AdminModel } from '@remoola/database-2';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity } from '../../common';
import { assertAdminV2Capability } from '../admin-v2-access';
import { AdminV2VerificationService } from './admin-v2-verification.service';

function one(value: string | string[] | undefined): string | undefined {
  return (typeof value === `string` ? value : value?.[0])?.trim() || undefined;
}

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

class VerificationDecisionBodyDTO {
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

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Verification`)
@Controller(`admin-v2/verification`)
export class AdminV2VerificationController {
  constructor(private readonly service: AdminV2VerificationService) {}

  @Get(`queue`)
  getQueue(@Identity() admin: AdminModel, @Query() query: Record<string, string | string[] | undefined>) {
    assertAdminV2Capability(admin, `verification.read`);
    const pageRaw = one(query.page);
    const pageSizeRaw = one(query.pageSize);
    return this.service.getQueue({
      page: pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : undefined,
      pageSize: pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : undefined,
      status: one(query.status),
      stripeIdentityStatus: one(query.stripeIdentityStatus),
      country: one(query.country),
      contractorKind: one(query.contractorKind),
      missingProfileData: one(query.missingProfileData) === `true`,
      missingDocuments: one(query.missingDocuments) === `true`,
    });
  }

  @Get(`:consumerId`)
  getCase(@Identity() admin: AdminModel, @Param(`consumerId`) consumerId: string) {
    const profile = assertAdminV2Capability(admin, `verification.read`);
    return this.service.getCase(consumerId, {
      canForceLogout: profile.capabilities.includes(`consumers.force_logout`),
      canDecide: profile.capabilities.includes(`verification.decide`),
      allowedActions: profile.capabilities.filter(
        (capability) => capability === `verification.decide` || capability === `consumers.force_logout`,
      ),
    });
  }

  @Post(`:consumerId/approve`)
  approve(
    @Identity() admin: AdminModel,
    @Param(`consumerId`) consumerId: string,
    @Body() body: VerificationDecisionBodyDTO,
    @Req() req: express.Request,
  ) {
    assertAdminV2Capability(admin, `verification.decide`);
    return this.service.applyDecision(consumerId, admin.id, `approve`, body, requestMeta(req));
  }

  @Post(`:consumerId/reject`)
  reject(
    @Identity() admin: AdminModel,
    @Param(`consumerId`) consumerId: string,
    @Body() body: VerificationDecisionBodyDTO,
    @Req() req: express.Request,
  ) {
    assertAdminV2Capability(admin, `verification.decide`);
    return this.service.applyDecision(consumerId, admin.id, `reject`, body, requestMeta(req));
  }

  @Post(`:consumerId/request-info`)
  requestInfo(
    @Identity() admin: AdminModel,
    @Param(`consumerId`) consumerId: string,
    @Body() body: VerificationDecisionBodyDTO,
    @Req() req: express.Request,
  ) {
    assertAdminV2Capability(admin, `verification.decide`);
    return this.service.applyDecision(consumerId, admin.id, `request-info`, body, requestMeta(req));
  }

  @Post(`:consumerId/flag`)
  flag(
    @Identity() admin: AdminModel,
    @Param(`consumerId`) consumerId: string,
    @Body() body: VerificationDecisionBodyDTO,
    @Req() req: express.Request,
  ) {
    assertAdminV2Capability(admin, `verification.decide`);
    return this.service.applyDecision(consumerId, admin.id, `flag`, body, requestMeta(req));
  }
}
