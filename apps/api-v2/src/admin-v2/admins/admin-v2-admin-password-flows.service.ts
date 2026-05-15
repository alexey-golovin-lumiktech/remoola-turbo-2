import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { oauthCrypto } from '@remoola/security-utils';

import { AUTH_IDENTITY_TYPES, AuthAuditService } from '../../shared/auth-audit.service';
import { constants, passwordUtils } from '../../shared-common';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import { AdminV2AdminPasswordFlowsRepository } from './admin-v2-admin-password-flows.repository';
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
    private readonly repository: AdminV2AdminPasswordFlowsRepository,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly auditTrail: AdminV2AdminAuditTrail,
    private readonly authAudit: AuthAuditService,
  ) {}

  async requestPasswordReset(body: { email?: string | null }) {
    const email = normalizeEmail(String(body.email ?? ``));
    if (!email) {
      throw new BadRequestException(`Email is required`);
    }

    const admin = await this.repository.getActiveAdminByEmail(email);
    if (!admin) {
      return;
    }

    const token = oauthCrypto.generateOAuthState();
    const tokenHash = oauthCrypto.hashOAuthState(token);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);
    const metadata = {
      targetEmail: admin.email,
      initiatedBy: `self_service`,
    };
    const created = await this.repository.createPasswordResetArtifact({
      adminId: admin.id,
      auditAdminId: admin.id,
      email: admin.email,
      tokenHash,
      expiresAt,
      metadata,
      ipAddress: null,
      userAgent: null,
    });
    const notificationSent = await this.auditTrail.sendAdminV2PasswordResetEmailNotification({
      email: admin.email,
      token,
    });
    await this.repository.updateAuditNotificationStatus({
      auditId: created.auditId,
      metadata,
      notificationSent,
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
        const target = await this.repository.getResetTarget(targetAdminId);
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
        const metadata = {
          targetEmail: target.email,
        };
        const created = await this.repository.createPasswordResetArtifact({
          adminId: target.id,
          auditAdminId: actorAdminId,
          email: target.email,
          tokenHash,
          expiresAt,
          metadata,
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        });
        const notificationSent = await this.auditTrail.sendAdminV2PasswordResetEmailNotification({
          email: target.email,
          token,
        });
        await this.repository.updateAuditNotificationStatus({
          auditId: created.auditId,
          metadata,
          notificationSent,
        });
        return {
          adminId: target.id,
          email: target.email,
          version: deriveVersion(target.updatedAt),
          notificationSent,
          deliveryStatus: notificationSent ? `sent` : `failed`,
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
    if (!constants.PASSWORD_RE.test(password)) {
      throw new BadRequestException(constants.INVALID_PASSWORD);
    }

    const tokenHash = oauthCrypto.hashOAuthState(token);
    const row = await this.repository.getResetToken(tokenHash);
    if (!row?.adminId) {
      throw new BadRequestException(`Reset token is invalid or expired`);
    }

    const admin = await this.repository.getActiveAdminById(row.adminId);
    if (!admin) {
      throw new BadRequestException(`Reset token is invalid or expired`);
    }

    const { hash, salt } = await passwordUtils.hashPassword(password);
    const consumed = await this.repository.consumeResetTokenAndUpdatePassword({
      resetTokenId: row.id,
      adminId: admin.id,
      hash,
      salt,
    });
    if (!consumed) {
      throw new BadRequestException(`Reset token is invalid or expired`);
    }

    await this.authAudit.clearLockout(AUTH_IDENTITY_TYPES.admin, admin.email);

    return {
      success: true as const,
      adminId: admin.id,
      email: admin.email,
    };
  }
}
