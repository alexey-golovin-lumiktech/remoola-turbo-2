import { Injectable } from '@nestjs/common';

import { AdminV2AdminAccessCommandsService } from './admin-v2-admin-access-commands.service';
import { AdminV2AdminCredentialsCommandsService } from './admin-v2-admin-credentials-commands.service';
import { AdminV2AdminInvitationsService } from './admin-v2-admin-invitations.service';
import { AdminV2AdminLifecycleCommandsService } from './admin-v2-admin-lifecycle-commands.service';
import { AdminV2AdminPasswordFlowsService } from './admin-v2-admin-password-flows.service';
import { AdminV2AdminsQueriesService } from './admin-v2-admins-queries.service';
import { type AdminV2RequestMeta as RequestMeta } from '../admin-v2-context.types';

@Injectable()
export class AdminV2AdminsService {
  constructor(
    private readonly queriesService: AdminV2AdminsQueriesService,
    private readonly credentialsCommands: AdminV2AdminCredentialsCommandsService,
    private readonly lifecycleCommands: AdminV2AdminLifecycleCommandsService,
    private readonly accessCommands: AdminV2AdminAccessCommandsService,
    private readonly invitationsService: AdminV2AdminInvitationsService,
    private readonly passwordFlowsService: AdminV2AdminPasswordFlowsService,
  ) {}

  async listAdmins(params?: { page?: number; pageSize?: number; q?: string; status?: string }) {
    return this.queriesService.listAdmins(params);
  }

  async getAdminCase(id: string) {
    return this.queriesService.getAdminCase(id);
  }

  async patchAdminPassword(targetAdminId: string, password: string, actorAdminId: string, meta: RequestMeta) {
    return this.credentialsCommands.patchAdminPassword(targetAdminId, password, actorAdminId, meta);
  }

  async updateAdminStatus(
    targetAdminId: string,
    action: `delete` | `restore`,
    actorAdminId: string,
    meta: RequestMeta,
  ) {
    return this.lifecycleCommands.updateAdminStatus(targetAdminId, action, actorAdminId, meta);
  }

  async inviteAdmin(actorAdminId: string, body: { email?: string; roleKey?: string }, meta: RequestMeta) {
    return this.invitationsService.inviteAdmin(actorAdminId, body, meta);
  }

  async requestPasswordReset(body: { email?: string | null }) {
    return this.passwordFlowsService.requestPasswordReset(body);
  }

  async deactivateAdmin(
    targetAdminId: string,
    actorAdminId: string,
    body: { version?: number; confirmed?: boolean; reason?: string | null },
    meta: RequestMeta,
  ) {
    return this.lifecycleCommands.deactivateAdmin(targetAdminId, actorAdminId, body, meta);
  }

  async restoreAdmin(targetAdminId: string, actorAdminId: string, body: { version?: number }, meta: RequestMeta) {
    return this.lifecycleCommands.restoreAdmin(targetAdminId, actorAdminId, body, meta);
  }

  async changeAdminRole(
    targetAdminId: string,
    actorAdminId: string,
    body: { version?: number; confirmed?: boolean; roleKey?: string },
    meta: RequestMeta,
  ) {
    return this.accessCommands.changeAdminRole(targetAdminId, actorAdminId, body, meta);
  }

  async changeAdminPermissions(
    targetAdminId: string,
    actorAdminId: string,
    body: { version?: number; capabilityOverrides?: Array<{ capability: string; mode: string }> },
    meta: RequestMeta,
  ) {
    return this.accessCommands.changeAdminPermissions(targetAdminId, actorAdminId, body, meta);
  }

  async resetAdminPassword(targetAdminId: string, actorAdminId: string, body: { version?: number }, meta: RequestMeta) {
    return this.passwordFlowsService.resetAdminPassword(targetAdminId, actorAdminId, body, meta);
  }

  async acceptInvitation(body: { token?: string; password?: string }) {
    return this.invitationsService.acceptInvitation(body);
  }

  async resetPasswordWithToken(body: { token?: string; password?: string }) {
    return this.passwordFlowsService.resetPasswordWithToken(body);
  }
}
