import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { adminErrorCodes } from '@remoola/shared-constants';

import { AdminStepUpService } from '../../admin-auth/admin-step-up.service';
import { Identity, type IIdentityContext, RequestMeta, type RequestMeta as RequestMetaPayload } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2AdminSessionsService } from './admin-v2-admin-sessions.service';
import {
  AdminPasswordPatchBody,
  ChangeAdminPermissionsBody,
  ChangeAdminRoleBody,
  DeactivateAdminBody,
  InviteAdminBody,
  LegacyAdminStatusBody,
  ListAdminsWithPagingQuery,
  VersionedAdminMutationBody,
} from './admin-v2-admins.dto';
import { AdminV2AdminsService } from './admin-v2-admins.service';

@ApiCookieAuth()
@ApiTags(`Admin v2: Admins`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/admins`)
export class AdminV2AdminsController {
  constructor(
    private readonly service: AdminV2AdminsService,
    private readonly accessService: AdminV2AccessService,
    private readonly adminSessionsService: AdminV2AdminSessionsService,
    private readonly adminStepUp: AdminStepUpService,
  ) {}

  @Get()
  async listAdmins(@Identity() admin: IIdentityContext, @Query() query: ListAdminsWithPagingQuery) {
    await this.accessService.assertCapability(admin, `admins.read`);
    return this.service.listAdmins(query);
  }

  @Get(`:id`)
  async getAdminCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `admins.read`);
    return this.service.getAdminCase(id);
  }

  @Post(`invite`)
  async inviteAdmin(
    @Identity() admin: IIdentityContext,
    @Body() body: InviteAdminBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.service.inviteAdmin(admin.id, body, meta);
  }

  @Post(`:id/deactivate`)
  async deactivateAdmin(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: DeactivateAdminBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.service.deactivateAdmin(id, admin.id, body, meta);
  }

  @Post(`:id/restore`)
  async restoreAdmin(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: VersionedAdminMutationBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.service.restoreAdmin(id, admin.id, body, meta);
  }

  @Post(`:id/role-change`)
  async changeAdminRole(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ChangeAdminRoleBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.service.changeAdminRole(id, admin.id, body, meta);
  }

  @Post(`:id/permissions-change`)
  async changeAdminPermissions(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ChangeAdminPermissionsBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.service.changeAdminPermissions(id, admin.id, body, meta);
  }

  @Post(`:id/password-reset`)
  async resetAdminPassword(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: VersionedAdminMutationBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.service.resetAdminPassword(id, admin.id, body, meta);
  }

  @Patch(`:id/password`)
  async patchAdminPassword(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: AdminPasswordPatchBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `admins.manage`);
    if (admin.type !== `SUPER`) {
      throw new BadRequestException(adminErrorCodes.ADMIN_ONLY_SUPER_CAN_CHANGE_PASSWORDS);
    }
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.service.patchAdminPassword(id, body.password, admin.id, meta);
  }

  @Patch(`:id`)
  async updateAdminStatus(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: LegacyAdminStatusBody,
    @RequestMeta() meta: RequestMetaPayload,
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
      await this.adminStepUp.verify(admin.id, confirmation);
    }
    return this.service.updateAdminStatus(id, body.action, admin.id, meta);
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
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(actor, `admins.manage`);
    if (actor.id === targetAdminId) {
      throw new BadRequestException(`Use /api/admin-v2/auth/revoke-session for own sessions`);
    }
    return this.adminSessionsService.revokeSessionAsManager(targetAdminId, sessionId, actor.id, {
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}
