import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { envs } from '../../envs';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { PrismaService } from '../../shared/prisma.service';
import { passwordUtils } from '../../shared-common';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';
import { AdminV2AdminAuditTrail } from './admin-v2-admin-audit-trail';
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
    private readonly prisma: PrismaService,
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
    const role = await this.prisma.adminRoleModel.findUnique({
      where: { id: roleId },
      select: { key: true },
    });
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
          this.prisma.adminModel.findFirst({
            where: { email },
            select: {
              id: true,
              deletedAt: true,
            },
          }),
          this.prisma.adminRoleModel.findFirst({
            where: { key: roleKey },
            select: {
              id: true,
              key: true,
            },
          }),
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

        const existingPending = await this.prisma.adminInvitationModel.findFirst({
          where: {
            email,
            roleId: role.id,
            acceptedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          select: {
            id: true,
            email: true,
            expiresAt: true,
            createdAt: true,
          },
        });

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
        const created = await this.prisma.$transaction(async (tx) => {
          const invitation = await tx.adminInvitationModel.create({
            data: {
              email,
              roleId: role.id,
              invitedBy: actorAdminId,
              expiresAt,
            },
            select: {
              id: true,
              email: true,
              expiresAt: true,
              createdAt: true,
            },
          });
          const audit = await tx.adminActionAuditLogModel.create({
            data: {
              adminId: actorAdminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.admin_invite,
              resource: `admin_invitation`,
              resourceId: invitation.id,
              metadata: {
                invitedEmail: email,
                roleKey: role.key,
                expiresAt: expiresAt.toISOString(),
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
        await this.prisma.adminActionAuditLogModel.update({
          where: { id: created.auditId },
          data: {
            metadata: {
              invitedEmail: email,
              roleKey: role.key,
              expiresAt: expiresAt.toISOString(),
              notificationSent,
              notificationType: `email`,
              deliveryStatus: notificationSent ? `sent` : `failed`,
            },
          },
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
    if (password.trim().length < 8) {
      throw new BadRequestException(`Password must be at least 8 characters long`);
    }

    const payload = await this.verifyInvitationToken(token);
    const invitation = await this.prisma.adminInvitationModel.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        roleId: true,
        expiresAt: true,
        acceptedAt: true,
      },
    });
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

    const existingAdmin = await this.prisma.adminModel.findFirst({
      where: { email: normalizeEmail(invitation.email) },
      select: {
        id: true,
        deletedAt: true,
      },
    });
    if (existingAdmin && existingAdmin.deletedAt == null) {
      throw new ConflictException(`An active admin with this email already exists`);
    }
    if (existingAdmin && existingAdmin.deletedAt != null) {
      throw new ConflictException(`This invitation belongs to an inactive admin. Restore that admin instead.`);
    }

    const roleKey = await this.getResolvedRoleKey(invitation.roleId);
    const { hash, salt } = await passwordUtils.hashPassword(password);

    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.adminInvitationModel.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
        },
        data: {
          acceptedAt: new Date(),
        },
      });
      if (consumed.count !== 1) {
        throw new ConflictException(`Invitation has already been accepted`);
      }

      const admin = await tx.adminModel.create({
        data: {
          email: normalizeEmail(invitation.email),
          password: hash,
          salt,
          roleId: invitation.roleId,
          type: toAdminType(roleKey),
        },
        select: {
          id: true,
          email: true,
        },
      });

      return {
        adminId: admin.id,
        email: admin.email,
        accepted: true as const,
      };
    });
  }
}
