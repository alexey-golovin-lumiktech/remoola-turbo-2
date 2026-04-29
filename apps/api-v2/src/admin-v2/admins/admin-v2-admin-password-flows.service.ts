import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { oauthCrypto } from '@remoola/security-utils';

import { ADMIN_AUTH_SESSION_REVOKE_REASONS } from '../../admin-auth/admin-auth-session-reasons';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { passwordUtils } from '../../shared-common';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import {
  PASSWORD_RESET_EXPIRY_MS,
  type RequestMeta,
  buildStaleVersionPayload,
  deriveVersion,
  normalizeEmail,
} from './admin-v2-admins.utils';

@Injectable()
export class AdminV2AdminPasswordFlowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly auditTrail: AdminV2AdminAuditTrail,
  ) {}

  async requestPasswordReset(body: { email?: string | null }) {
    const email = normalizeEmail(String(body.email ?? ``));
    if (!email) {
      throw new BadRequestException(`Email is required`);
    }

    const admin = await this.prisma.adminModel.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
      },
    });
    if (!admin) {
      return;
    }

    const token = oauthCrypto.generateOAuthState();
    const tokenHash = oauthCrypto.hashOAuthState(token);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.resetPasswordModel.updateMany({
        where: {
          adminId: admin.id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      await tx.resetPasswordModel.create({
        data: {
          adminId: admin.id,
          tokenHash,
          expiredAt: expiresAt,
          appScope: `admin-v2`,
        },
      });
      const audit = await tx.adminActionAuditLogModel.create({
        data: {
          adminId: admin.id,
          action: ADMIN_ACTION_AUDIT_ACTIONS.admin_password_reset,
          resource: `admin`,
          resourceId: admin.id,
          metadata: {
            targetEmail: admin.email,
            initiatedBy: `self_service`,
            notificationSent: false,
            notificationType: `email`,
            deliveryStatus: `pending`,
          },
          ipAddress: null,
          userAgent: null,
        },
        select: {
          id: true,
        },
      });
      return { auditId: audit.id };
    });

    await this.auditTrail.sendAdminV2PasswordResetEmail({
      email: admin.email,
      token,
      auditId: created.auditId,
      metadata: {
        targetEmail: admin.email,
        initiatedBy: `self_service`,
      },
    });
  }

  async resetAdminPassword(targetAdminId: string, actorAdminId: string, body: { version?: number }, meta: RequestMeta) {
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId: actorAdminId,
      scope: `admin-password-reset:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: {
        targetAdminId,
        expectedVersion,
      },
      execute: async () => {
        const target = await this.prisma.adminModel.findUnique({
          where: { id: targetAdminId },
          select: {
            id: true,
            email: true,
            updatedAt: true,
            deletedAt: true,
          },
        });
        if (!target) {
          throw new NotFoundException(`Admin not found`);
        }
        if (deriveVersion(target.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(target.updatedAt));
        }
        if (target.deletedAt) {
          throw new ConflictException(`Inactive admins cannot receive password reset`);
        }

        const token = oauthCrypto.generateOAuthState();
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);
        const tokenHash = oauthCrypto.hashOAuthState(token);
        const created = await this.prisma.$transaction(async (tx) => {
          await tx.resetPasswordModel.updateMany({
            where: {
              adminId: target.id,
              deletedAt: null,
            },
            data: {
              deletedAt: new Date(),
            },
          });
          await tx.resetPasswordModel.create({
            data: {
              adminId: target.id,
              tokenHash,
              expiredAt: expiresAt,
              appScope: `admin-v2`,
            },
          });
          const audit = await tx.adminActionAuditLogModel.create({
            data: {
              adminId: actorAdminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.admin_password_reset,
              resource: `admin`,
              resourceId: target.id,
              metadata: {
                targetEmail: target.email,
                notificationSent: false,
                notificationType: `email`,
                deliveryStatus: `pending`,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
            select: {
              id: true,
            },
          });
          return {
            auditId: audit.id,
          };
        });
        const { notificationSent, deliveryStatus } = await this.auditTrail.sendAdminV2PasswordResetEmail({
          email: target.email,
          token,
          auditId: created.auditId,
          metadata: {
            targetEmail: target.email,
          },
        });
        return {
          adminId: target.id,
          email: target.email,
          version: deriveVersion(target.updatedAt),
          notificationSent,
          deliveryStatus,
        };
      },
    });
  }

  async resetPasswordWithToken(body: { token?: string; password?: string }) {
    const token = String(body.token ?? ``).trim();
    const password = String(body.password ?? ``);
    if (!token) {
      throw new BadRequestException(`Reset token is required`);
    }
    if (password.trim().length < 8) {
      throw new BadRequestException(`Password must be at least 8 characters long`);
    }

    const tokenHash = oauthCrypto.hashOAuthState(token);
    const row = await this.prisma.resetPasswordModel.findFirst({
      where: {
        tokenHash,
        adminId: { not: null },
        deletedAt: null,
        expiredAt: { gt: new Date() },
        appScope: `admin-v2`,
      },
      select: {
        id: true,
        adminId: true,
      },
    });
    if (!row?.adminId) {
      throw new BadRequestException(`Reset token is invalid or expired`);
    }

    const admin = await this.prisma.adminModel.findFirst({
      where: { id: row.adminId, deletedAt: null },
      select: {
        id: true,
        email: true,
      },
    });
    if (!admin) {
      throw new BadRequestException(`Reset token is invalid or expired`);
    }

    const { hash, salt } = await passwordUtils.hashPassword(password);
    const consumed = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.resetPasswordModel.updateMany({
        where: { id: row.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (updateResult.count !== 1) {
        return null;
      }
      await tx.adminModel.update({
        where: { id: admin.id },
        data: {
          password: hash,
          salt,
        },
      });
      await tx.adminAuthSessionModel.updateMany({
        where: {
          adminId: admin.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          invalidatedReason: ADMIN_AUTH_SESSION_REVOKE_REASONS.password_reset,
          lastUsedAt: new Date(),
        },
      });
      await tx.accessRefreshTokenModel.deleteMany({
        where: {
          identityId: admin.id,
        },
      });
      return admin;
    });
    if (!consumed) {
      throw new BadRequestException(`Reset token is invalid or expired`);
    }

    return {
      success: true as const,
      adminId: consumed.id,
      email: consumed.email,
    };
  }
}
