import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import express from 'express';

import { adminErrorCodes } from '@remoola/shared-constants';

import { AdminAuthService } from '../../admin-auth/admin-auth.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { constants } from '../../shared-common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2AdminSessionsService } from './admin-v2-admin-sessions.service';
import { AdminV2AdminsService } from './admin-v2-admins.service';

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

class InviteAdminBody {
  @Expose()
  @IsEmail()
  email!: string;

  @Expose()
  @IsString()
  roleKey!: string;

  @Expose()
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}

class VersionedAdminMutationBody {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;

  @Expose()
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}

class DeactivateAdminBody extends VersionedAdminMutationBody {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  reason?: string;
}

class ChangeAdminRoleBody extends VersionedAdminMutationBody {
  @Expose()
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @IsString()
  roleKey!: string;
}

class PermissionOverride {
  @Expose()
  @IsString()
  capability!: string;

  @Expose()
  @IsString()
  @IsIn([`inherit`, `grant`, `deny`])
  mode!: `inherit` | `grant` | `deny`;
}

class ChangeAdminPermissionsBody extends VersionedAdminMutationBody {
  @Expose()
  @Type(() => PermissionOverride)
  @IsArray()
  @ValidateNested({ each: true })
  capabilityOverrides!: PermissionOverride[];
}

class ListAdminsQuery {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize?: number;

  @Expose()
  @IsString()
  @IsOptional()
  q?: string;

  @Expose()
  @IsString()
  @IsOptional()
  status?: string;
}

class AdminPasswordPatchBody {
  @Expose()
  @IsString()
  @Matches(constants.PASSWORD_RE, { message: constants.INVALID_PASSWORD })
  password!: string;

  @Expose()
  @IsString()
  @MaxLength(256)
  passwordConfirmation!: string;
}

class LegacyAdminStatusBody {
  @Expose()
  @IsIn([`delete`, `restore`])
  action!: `delete` | `restore`;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  passwordConfirmation?: string;
}

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Admins`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/admins`)
export class AdminV2AdminsController {
  constructor(
    private readonly service: AdminV2AdminsService,
    private readonly accessService: AdminV2AccessService,
    private readonly adminSessionsService: AdminV2AdminSessionsService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  @Get()
  async listAdmins(@Identity() admin: IIdentityContext, @Query() query: ListAdminsQuery) {
    await this.accessService.assertCapability(admin, `admins.read`);
    return this.service.listAdmins(query);
  }

  @Get(`:id`)
  async getAdminCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `admins.read`);
    return this.service.getAdminCase(id);
  }

  @Post(`invite`)
  async inviteAdmin(@Identity() admin: IIdentityContext, @Body() body: InviteAdminBody, @Req() req: express.Request) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.inviteAdmin(admin.id, body, requestMeta(req));
  }

  @Post(`:id/deactivate`)
  async deactivateAdmin(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: DeactivateAdminBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.deactivateAdmin(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/restore`)
  async restoreAdmin(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: VersionedAdminMutationBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.restoreAdmin(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/role-change`)
  async changeAdminRole(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ChangeAdminRoleBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.changeAdminRole(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/permissions-change`)
  async changeAdminPermissions(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ChangeAdminPermissionsBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.changeAdminPermissions(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/password-reset`)
  async resetAdminPassword(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: VersionedAdminMutationBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.resetAdminPassword(id, admin.id, body, requestMeta(req));
  }

  @Patch(`:id/password`)
  async patchAdminPassword(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: AdminPasswordPatchBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    if (admin.type !== `SUPER`) {
      throw new BadRequestException(adminErrorCodes.ADMIN_ONLY_SUPER_CAN_CHANGE_PASSWORDS);
    }
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    return this.service.patchAdminPassword(id, body.password, admin.id, requestMeta(req));
  }

  @Patch(`:id`)
  async updateAdminStatus(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: LegacyAdminStatusBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    if (admin.type !== `SUPER`) {
      throw new BadRequestException(adminErrorCodes.ADMIN_ONLY_SUPER_CAN_UPDATE_ADMINS);
    }
    if (body.action === `delete` && id === admin.id) {
      throw new BadRequestException(adminErrorCodes.ADMIN_CANNOT_DELETE_YOURSELF);
    }
    if (body.action === `delete`) {
      const confirmation = typeof body.passwordConfirmation === `string` ? body.passwordConfirmation.trim() : ``;
      if (confirmation.length === 0) {
        throw new BadRequestException(adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_REQUIRED);
      }
      await this.adminAuthService.verifyStepUp(admin.id, confirmation);
    }
    return this.service.updateAdminStatus(id, body.action, admin.id, requestMeta(req));
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
