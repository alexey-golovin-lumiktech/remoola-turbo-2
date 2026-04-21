import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import express from 'express';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2AdminSessionsService } from './admin-v2-admin-sessions.service';
import { AdminV2AdminsService } from './admin-v2-admins.service';

function one(value: string | string[] | undefined): string | undefined {
  return (typeof value === `string` ? value : value?.[0])?.trim() || undefined;
}

function toNumber(value: string | undefined): number | undefined {
  if (value == null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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

class InviteAdminBodyDTO {
  @Expose()
  @IsEmail()
  email!: string;

  @Expose()
  @IsString()
  roleKey!: string;
}

class VersionedAdminMutationBodyDTO {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;
}

class DeactivateAdminBodyDTO extends VersionedAdminMutationBodyDTO {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  reason?: string;
}

class ChangeAdminRoleBodyDTO extends VersionedAdminMutationBodyDTO {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @IsString()
  roleKey!: string;
}

class PermissionOverrideDTO {
  @Expose()
  @IsString()
  capability!: string;

  @Expose()
  @IsString()
  @IsIn([`inherit`, `grant`, `deny`])
  mode!: `inherit` | `grant` | `deny`;
}

class ChangeAdminPermissionsBodyDTO extends VersionedAdminMutationBodyDTO {
  @Expose()
  @Type(() => PermissionOverrideDTO)
  @IsArray()
  capabilityOverrides!: PermissionOverrideDTO[];
}

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Admins`)
@Controller(`admin-v2/admins`)
export class AdminV2AdminsController {
  constructor(
    private readonly service: AdminV2AdminsService,
    private readonly accessService: AdminV2AccessService,
    private readonly adminSessionsService: AdminV2AdminSessionsService,
  ) {}

  @Get()
  async listAdmins(@Identity() admin: IIdentityContext, @Query() query: Record<string, string | string[] | undefined>) {
    await this.accessService.assertCapability(admin, `admins.read`);
    return this.service.listAdmins({
      page: toNumber(one(query.page)),
      pageSize: toNumber(one(query.pageSize)),
      q: one(query.q),
      status: one(query.status),
    });
  }

  @Get(`:id`)
  async getAdminCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `admins.read`);
    return this.service.getAdminCase(id);
  }

  @Post(`invite`)
  async inviteAdmin(
    @Identity() admin: IIdentityContext,
    @Body() body: InviteAdminBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    return this.service.inviteAdmin(admin.id, body, requestMeta(req));
  }

  @Post(`:id/deactivate`)
  async deactivateAdmin(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: DeactivateAdminBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    return this.service.deactivateAdmin(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/restore`)
  async restoreAdmin(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: VersionedAdminMutationBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    return this.service.restoreAdmin(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/role-change`)
  async changeAdminRole(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ChangeAdminRoleBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    return this.service.changeAdminRole(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/permissions-change`)
  async changeAdminPermissions(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ChangeAdminPermissionsBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    return this.service.changeAdminPermissions(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/password-reset`)
  async resetAdminPassword(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: VersionedAdminMutationBodyDTO,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    return this.service.resetAdminPassword(id, admin.id, body, requestMeta(req));
  }

  @Get(`:id/sessions`)
  async listAdminSessions(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `admins.read`);
    return this.adminSessionsService.listSessionsForAdmin(id);
  }

  @Post(`:id/sessions/:sessionId/revoke`)
  async revokeAdminSession(
    @Identity() actor: IIdentityContext,
    @Param(`id`) targetAdminId: string,
    @Param(`sessionId`) sessionId: string,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(actor, `admins.manage`);
    if (actor.id === targetAdminId) {
      throw new BadRequestException(`Use /api/admin-v2/auth/revoke-session for own sessions`);
    }
    const meta = requestMeta(req);
    return this.adminSessionsService.revokeSessionAsManager(targetAdminId, sessionId, actor.id, {
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}
