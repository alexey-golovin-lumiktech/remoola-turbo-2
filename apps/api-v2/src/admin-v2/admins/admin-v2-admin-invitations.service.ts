import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { envs } from '../../envs';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { passwordUtils } from '../../shared-common';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import {
  assertAdminEmailAvailable,
  assertInvitationMatchesPayload,
  assertInvitationNotExpired,
  buildAcceptedInvitationResult,
  buildCreatedInvitationResult,
  buildPendingInvitationResult,
  requireInvitationPassword,
  requireInvitationToken,
  requireInviteEmail,
  requireInviteRoleKey,
  throwInvalidInvitationToken,
  throwInvitationAlreadyAccepted,
} from './admin-v2-admin-invitations.helpers';
import { AdminV2AdminInvitationsRepository } from './admin-v2-admin-invitations.repository';
import { AdminV2AdminLinks } from './admin-v2-admin-links';
import {
  ALLOWED_ROLE_KEYS,
  INVITATION_EXPIRY_MS,
  type AdminInvitationTokenPayload,
  type RequestMeta,
  toAdminType,
  normalizeEmail,
} from './admin-v2-admins.utils';

@Injectable()
export class AdminV2AdminInvitationsService {
  constructor(
    private readonly repository: AdminV2AdminInvitationsRepository,
    private readonly transactions: PrismaTransactionRunner,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly jwtService: JwtService,
    private readonly links: AdminV2AdminLinks,
    private readonly auditTrail: AdminV2AdminAuditTrail,
  ) {}

  private async buildInvitationToken(params: { invitationId: string; email: string; roleId: string; expiresAt: Date }) {
    const expiresInSeconds = Math.max(60, Math.floor((params.expiresAt.getTime() - Date.now()) / 1000));
    return this.jwtService.signAsync(
      {
        sub: params.invitationId,
        email: params.email,
        roleId: params.roleId,
        typ: `admin_invitation`,
        scope: `admin_v2`,
      } satisfies AdminInvitationTokenPayload,
      {
        secret: envs.JWT_REFRESH_SECRET,
        expiresIn: expiresInSeconds,
      },
    );
  }

  private async verifyInvitationToken(token: string): Promise<AdminInvitationTokenPayload> {
    try {
      const payload = this.jwtService.verify<AdminInvitationTokenPayload>(token, {
        secret: envs.JWT_REFRESH_SECRET,
      });
      if (payload.typ !== `admin_invitation` || payload.scope !== `admin_v2`) {
        throwInvalidInvitationToken();
      }
      return payload;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throwInvalidInvitationToken();
    }
  }

  private async getResolvedRoleKey(roleId: string): Promise<string> {
    const role = await this.repository.getRoleById(roleId);
    if (!role || !ALLOWED_ROLE_KEYS.has(role.key)) {
      throw new BadRequestException(`Unsupported admin role`);
    }
    return role.key;
  }

  async inviteAdmin(actorAdminId: string, body: { email?: string; roleKey?: string }, meta: RequestMeta) {
    const email = requireInviteEmail(body.email);
    const roleKey = requireInviteRoleKey(body.roleKey);

    return this.idempotency.execute({
      adminId: actorAdminId,
      scope: `admin-invite:${email}`,
      key: meta.idempotencyKey,
      payload: { email, roleKey },
      execute: async () => {
        const [existingAdmin, role] = await Promise.all([
          this.repository.getAdminByEmail(email),
          this.repository.getRoleByKey(roleKey),
        ]);

        if (!role) {
          throw new BadRequestException(`Invite role is not available`);
        }
        assertAdminEmailAvailable(
          existingAdmin,
          `This email belongs to an inactive admin. Use restore instead of invite.`,
        );

        const existingPending = await this.repository.getPendingInvitation(email, role.id);

        if (existingPending) {
          return buildPendingInvitationResult(existingPending, role.key);
        }

        const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);
        const created = await this.transactions.run(async (tx) => {
          const invitation = await this.repository.createInvitation(tx, {
            email,
            roleId: role.id,
            actorAdminId,
            expiresAt,
          });
          const audit = await this.repository.createInvitationAuditEntry(tx, {
            actorAdminId,
            invitationId: invitation.id,
            email,
            roleKey: role.key,
            expiresAt,
            ipAddress: meta.ipAddress ?? null,
            userAgent: meta.userAgent ?? null,
          });

          return {
            ...invitation,
            auditId: audit.id,
          };
        });
        const token = await this.buildInvitationToken({
          invitationId: created.id,
          email,
          roleId: role.id,
          expiresAt,
        });
        const notificationSent = await this.auditTrail.trySendInvitationEmail({
          email,
          signupLink: this.links.buildInvitationUrl(token),
        });
        await this.repository.updateInvitationAuditDelivery({
          auditId: created.auditId,
          invitedEmail: email,
          roleKey: role.key,
          expiresAt: expiresAt.toISOString(),
          notificationSent,
        });

        return buildCreatedInvitationResult(created, role.key, notificationSent);
      },
    });
  }

  async acceptInvitation(body: { token?: string; password?: string }) {
    const token = requireInvitationToken(body.token);
    const password = requireInvitationPassword(body.password);

    const payload = await this.verifyInvitationToken(token);
    const invitation = await this.repository.getInvitationForAcceptance(payload.sub);
    assertInvitationMatchesPayload(invitation, payload);
    if (invitation.acceptedAt) {
      throwInvitationAlreadyAccepted();
    }
    assertInvitationNotExpired(invitation.expiresAt);

    const normalizedInvitationEmail = normalizeEmail(invitation.email);
    const existingAdmin = await this.repository.getAdminByEmail(normalizedInvitationEmail);
    assertAdminEmailAvailable(
      existingAdmin,
      `This invitation belongs to an inactive admin. Restore that admin instead.`,
    );

    const roleKey = await this.getResolvedRoleKey(invitation.roleId);
    const { hash, salt } = await passwordUtils.hashPassword(password);

    const accepted = await this.transactions.run(async (tx) => {
      const consumed = await this.repository.consumeInvitation(tx, invitation.id);
      if (consumed.count !== 1) {
        return null;
      }

      const admin = await this.repository.createAdminFromInvitation(tx, {
        email: normalizedInvitationEmail,
        roleId: invitation.roleId,
        hash,
        salt,
        type: toAdminType(roleKey),
      });

      return buildAcceptedInvitationResult(admin);
    });
    if (!accepted) {
      throwInvitationAlreadyAccepted();
    }

    return accepted;
  }
}
