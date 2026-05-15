import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { envs } from '../../envs';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { constants, passwordUtils } from '../../shared-common';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
import { AdminV2AdminInvitationsRepository } from './admin-v2-admin-invitations.repository';
import { AdminV2AdminLinks } from './admin-v2-admin-links';
import {
  ALLOWED_ROLE_KEYS,
  INVITATION_EXPIRY_MS,
  type AdminInvitationTokenPayload,
  type RequestMeta,
  buildActiveInvitationStatus,
  normalizeEmail,
  toAdminType,
  toNullableIso,
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
        throw new BadRequestException(`Invitation token is invalid`);
      }
      return payload;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Invitation token is invalid`);
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
    const email = normalizeEmail(String(body.email ?? ``));
    if (!email) {
      throw new BadRequestException(`Invite email is required`);
    }
    const roleKey = String(body.roleKey ?? ``).trim();
    if (!ALLOWED_ROLE_KEYS.has(roleKey)) {
      throw new BadRequestException(`Unsupported invite role`);
    }

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
        if (existingAdmin && existingAdmin.deletedAt == null) {
          throw new ConflictException(`An active admin with this email already exists`);
        }
        if (existingAdmin && existingAdmin.deletedAt != null) {
          throw new ConflictException(`This email belongs to an inactive admin. Use restore instead of invite.`);
        }

        const existingPending = await this.repository.getPendingInvitation(email, role.id);

        if (existingPending) {
          return {
            invitationId: existingPending.id,
            email: existingPending.email,
            roleKey: role.key,
            expiresAt: toNullableIso(existingPending.expiresAt),
            createdAt: existingPending.createdAt.toISOString(),
            alreadyPending: true,
            status: buildActiveInvitationStatus(existingPending.expiresAt, null),
          };
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

        return {
          invitationId: created.id,
          email: created.email,
          roleKey: role.key,
          expiresAt: toNullableIso(created.expiresAt),
          createdAt: created.createdAt.toISOString(),
          alreadyPending: false,
          notificationSent,
          deliveryStatus: notificationSent ? `sent` : `failed`,
        };
      },
    });
  }

  async acceptInvitation(body: { token?: string; password?: string }) {
    const token = String(body.token ?? ``).trim();
    const password = String(body.password ?? ``);
    if (!token) {
      throw new BadRequestException(`Invitation token is required`);
    }
    if (!constants.PASSWORD_RE.test(password)) {
      throw new BadRequestException(constants.INVALID_PASSWORD);
    }

    const payload = await this.verifyInvitationToken(token);
    const invitation = await this.repository.getInvitationForAcceptance(payload.sub);
    if (
      !invitation ||
      normalizeEmail(invitation.email) !== normalizeEmail(payload.email) ||
      invitation.roleId !== payload.roleId
    ) {
      throw new BadRequestException(`Invitation token is invalid`);
    }
    if (invitation.acceptedAt) {
      throw new ConflictException(`Invitation has already been accepted`);
    }
    if (invitation.expiresAt && invitation.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException(`Invitation has expired`);
    }

    const normalizedInvitationEmail = normalizeEmail(invitation.email);
    const existingAdmin = await this.repository.getAdminByEmail(normalizedInvitationEmail);
    if (existingAdmin && existingAdmin.deletedAt == null) {
      throw new ConflictException(`An active admin with this email already exists`);
    }
    if (existingAdmin && existingAdmin.deletedAt != null) {
      throw new ConflictException(`This invitation belongs to an inactive admin. Restore that admin instead.`);
    }

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

      return {
        adminId: admin.id,
        email: admin.email,
        accepted: true as const,
      };
    });
    if (!accepted) {
      throw new ConflictException(`Invitation has already been accepted`);
    }

    return accepted;
  }
}
