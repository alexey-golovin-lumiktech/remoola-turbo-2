import { BadRequestException, Injectable } from '@nestjs/common';

import { adminErrorCodes } from '@remoola/shared-constants';

import { ADMIN_AUTH_SESSION_REVOKE_REASONS } from '../../admin/auth/admin-auth-session-reasons';
import { AdminAuthService, type AdminAuthSessionView } from '../../admin/auth/admin-auth.service';
import { ADMIN_ACTION_AUDIT_ACTIONS, AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';

export type CrossAdminRevokeContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type CrossAdminRevokeResult = {
  ok: true;
  revokedSessionId: string;
  alreadyRevoked: boolean;
};

@Injectable()
export class AdminV2AdminSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAuthService: AdminAuthService,
    private readonly adminActionAudit: AdminActionAuditService,
  ) {}

  async listSessionsForAdmin(adminId: string): Promise<{ sessions: AdminAuthSessionView[] }> {
    const admin = await this.prisma.adminModel.findFirst({
      where: { id: adminId, deletedAt: null },
      select: { id: true },
    });
    if (!admin) {
      throw new BadRequestException(adminErrorCodes.ADMIN_NO_IDENTITY_RECORD);
    }
    const sessions = await this.adminAuthService.listSessionsForAdmin(adminId);
    return { sessions };
  }

  async revokeSessionAsManager(
    targetAdminId: string,
    sessionId: string,
    actorAdminId: string,
    ctx: CrossAdminRevokeContext,
  ): Promise<CrossAdminRevokeResult> {
    if (actorAdminId === targetAdminId) {
      throw new BadRequestException(`Use /api/admin-v2/auth/revoke-session for own sessions`);
    }
    const session = await this.prisma.adminAuthSessionModel.findFirst({
      where: { id: sessionId, adminId: targetAdminId },
      select: { id: true },
    });
    if (!session) {
      throw new BadRequestException(adminErrorCodes.ADMIN_NO_IDENTITY_RECORD);
    }

    const result = await this.adminAuthService.revokeSessionByIdAndAudit(targetAdminId, sessionId, {
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      reason: ADMIN_AUTH_SESSION_REVOKE_REASONS.cross_admin_revoked,
    });

    await this.adminActionAudit.record({
      adminId: actorAdminId,
      action: ADMIN_ACTION_AUDIT_ACTIONS.admin_session_revoke_other,
      resource: `admin_auth_session`,
      resourceId: sessionId,
      metadata: {
        targetAdminId,
        alreadyRevoked: result.alreadyRevoked,
      },
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
    });

    return {
      ok: true,
      revokedSessionId: result.revokedSessionId,
      alreadyRevoked: result.alreadyRevoked,
    };
  }
}
