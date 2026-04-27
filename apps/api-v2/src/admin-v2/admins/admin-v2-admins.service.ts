import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { $Enums, Prisma } from '@remoola/database-2';
import { oauthCrypto } from '@remoola/security-utils';

import { ADMIN_AUTH_SESSION_REVOKE_REASONS } from '../../admin-auth/admin-auth-session-reasons';
import { envs } from '../../envs';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';
import { hashPassword, passwordUtils } from '../../shared-common';
import { ADMIN_V2_SCHEMA_ROLES, OVERRIDABLE_ADMIN_V2_CAPABILITIES } from '../admin-v2-access';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2IdempotencyService } from '../admin-v2-idempotency.service';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;
const REASON_MAX_LENGTH = 500;
const RECENT_ACTIVITY_LIMIT = 20;
const ALLOWED_ROLE_KEYS = new Set<string>(ADMIN_V2_SCHEMA_ROLES);
const ADMIN_PERMISSION_OVERRIDE_CAPABILITIES = new Set<string>(OVERRIDABLE_ADMIN_V2_CAPABILITIES);
const ADMIN_PERMISSION_OVERRIDE_MODES = new Set<string>([`inherit`, `grant`, `deny`]);

type AdminPermissionOverrideMode = `inherit` | `grant` | `deny`;

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

type AdminInvitationTokenPayload = {
  sub: string;
  email: string;
  roleId: string;
  typ: `admin_invitation`;
  scope: `admin_v2`;
};

function normalizePage(value?: number): number {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : DEFAULT_PAGE;
}

function normalizePageSize(value?: number): number {
  if (!Number.isFinite(value) || !value) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value)));
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeReason(value?: string | null): string | null {
  const normalized = value?.trim() ?? ``;
  if (!normalized) {
    return null;
  }
  if (normalized.length > REASON_MAX_LENGTH) {
    throw new BadRequestException(`Reason is too long`);
  }
  return normalized;
}

function normalizeOriginCandidate(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed === `ADMIN_V2_APP_ORIGIN` || trimmed === `ADMIN_APP_ORIGIN`) {
    return null;
  }
  const withScheme = trimmed.includes(`://`) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

function deriveVersion(updatedAt: Date): number {
  return updatedAt.getTime();
}

function toNullableIso(value: Date | null | undefined): string | null {
  return value?.toISOString() ?? null;
}

function deriveStatus(deletedAt: Date | null): `ACTIVE` | `INACTIVE` {
  return deletedAt ? `INACTIVE` : `ACTIVE`;
}

function toAdminType(roleKey: string): $Enums.AdminType {
  if (roleKey === `SUPER_ADMIN`) {
    return $Enums.AdminType.SUPER;
  }
  if (ALLOWED_ROLE_KEYS.has(roleKey)) {
    return $Enums.AdminType.ADMIN;
  }
  throw new BadRequestException(`Unsupported admin role key`);
}

function toPermissionOverrideGrant(mode: AdminPermissionOverrideMode): boolean | null {
  if (mode === `grant`) return true;
  if (mode === `deny`) return false;
  return null;
}

function buildStaleVersionPayload(currentUpdatedAt: Date) {
  return {
    error: `STALE_VERSION`,
    message: `Admin record has been modified by another operator`,
    currentVersion: deriveVersion(currentUpdatedAt),
    currentUpdatedAt: currentUpdatedAt.toISOString(),
    recommendedAction: `reload`,
  };
}

function buildActiveInvitationStatus(
  expiresAt: Date | null,
  acceptedAt: Date | null,
): `accepted` | `expired` | `pending` {
  if (acceptedAt) return `accepted`;
  if (expiresAt && expiresAt.getTime() <= Date.now()) return `expired`;
  return `pending`;
}

@Injectable()
export class AdminV2AdminsService {
  private readonly logger = new Logger(AdminV2AdminsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AdminV2AccessService,
    private readonly idempotency: AdminV2IdempotencyService,
    private readonly jwtService: JwtService,
    private readonly mailingService: MailingService,
    private readonly originResolver: OriginResolverService,
  ) {}

  private resolveAdminV2Origin(): string {
    const direct = normalizeOriginCandidate(envs.ADMIN_V2_APP_ORIGIN);
    if (direct) {
      return this.originResolver.normalizeOrigin(direct);
    }
    const legacy = normalizeOriginCandidate(envs.ADMIN_APP_ORIGIN);
    if (legacy) {
      return this.originResolver.normalizeOrigin(legacy);
    }
    throw new InternalServerErrorException(`Admin v2 app origin is not configured`);
  }

  private async sendAdminV2PasswordResetEmail(params: {
    email: string;
    token: string;
    auditId: string;
    metadata: Prisma.InputJsonValue;
  }): Promise<{ notificationSent: boolean; deliveryStatus: `sent` | `failed` }> {
    const resetUrl = new URL(`/reset-password`, this.resolveAdminV2Origin());
    resetUrl.searchParams.set(`token`, params.token);
    const notificationSent = await this.mailingService.sendAdminV2PasswordResetEmail({
      email: params.email,
      forgotPasswordLink: resetUrl.toString(),
    });
    await this.prisma.adminActionAuditLogModel.update({
      where: { id: params.auditId },
      data: {
        metadata: {
          ...(params.metadata as Record<string, unknown>),
          notificationSent,
          notificationType: `email`,
          deliveryStatus: notificationSent ? `sent` : `failed`,
        } as Prisma.InputJsonValue,
      },
    });
    return { notificationSent, deliveryStatus: notificationSent ? `sent` : `failed` };
  }

  private async trySendInvitationEmail(params: { email: string; signupLink: string }): Promise<boolean> {
    try {
      await this.mailingService.sendInvitationEmail(params);
      return true;
    } catch {
      return false;
    }
  }

  private async recordAdminActionAudit(params: {
    adminId: string;
    action: string;
    resourceId: string;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    try {
      await this.prisma.adminActionAuditLogModel.create({
        data: {
          adminId: params.adminId,
          action: params.action,
          resource: `admin`,
          resourceId: params.resourceId,
          metadata: params.metadata ?? Prisma.JsonNull,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record admin compatibility audit ${JSON.stringify({
          action: params.action,
          resourceId: params.resourceId,
          message: error instanceof Error ? error.message : String(error),
        })}`,
      );
    }
  }

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

  private async buildLastActivityMap(adminIds: string[]): Promise<Map<string, string | null>> {
    const lastActivity = new Map<string, Date>();
    if (adminIds.length === 0) {
      return new Map();
    }

    const [authEvents, adminActions] = await Promise.all([
      this.prisma.authAuditLogModel.findMany({
        where: {
          identityType: `admin`,
          identityId: { in: adminIds },
        },
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        take: adminIds.length * 5,
        select: {
          identityId: true,
          createdAt: true,
        },
      }),
      this.prisma.adminActionAuditLogModel.findMany({
        where: {
          adminId: { in: adminIds },
        },
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        take: adminIds.length * 5,
        select: {
          adminId: true,
          createdAt: true,
        },
      }),
    ]);

    for (const event of authEvents) {
      if (!event.identityId) continue;
      if (!lastActivity.has(event.identityId)) {
        lastActivity.set(event.identityId, event.createdAt);
      }
    }
    for (const action of adminActions) {
      if (!lastActivity.has(action.adminId)) {
        lastActivity.set(action.adminId, action.createdAt);
      }
    }

    return new Map(adminIds.map((adminId) => [adminId, lastActivity.get(adminId)?.toISOString() ?? null]));
  }

  async listAdmins(params?: { page?: number; pageSize?: number; q?: string; status?: string }) {
    const page = normalizePage(params?.page);
    const pageSize = normalizePageSize(params?.pageSize);
    const q = params?.q?.trim();
    const status = params?.status?.trim().toUpperCase();
    const adminWhere: Prisma.AdminModelWhereInput = {
      ...(status === `ACTIVE` ? { deletedAt: null } : status === `INACTIVE` ? { deletedAt: { not: null } } : {}),
      ...(q
        ? {
            OR: [{ email: { contains: q, mode: `insensitive` } }],
          }
        : {}),
    };

    const [admins, total, pendingInvitations] = await Promise.all([
      this.prisma.adminModel.findMany({
        where: adminWhere,
        orderBy: [{ deletedAt: `asc` }, { updatedAt: `desc` }, { id: `desc` }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          role: {
            select: {
              key: true,
            },
          },
        },
      }),
      this.prisma.adminModel.count({ where: adminWhere }),
      this.prisma.adminInvitationModel.findMany({
        where: {
          acceptedAt: null,
        },
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        take: 10,
        select: {
          id: true,
          email: true,
          expiresAt: true,
          acceptedAt: true,
          createdAt: true,
          role: {
            select: {
              key: true,
            },
          },
          invitedByAdmin: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const lastActivityMap = await this.buildLastActivityMap(admins.map((admin) => admin.id));
    const accessProfiles = await Promise.all(
      admins.map((admin) =>
        this.accessService.getAccessProfile({
          id: admin.id,
          email: admin.email,
          type: admin.type,
        }),
      ),
    );

    return {
      items: admins.map((admin, index) => ({
        id: admin.id,
        email: admin.email,
        type: admin.type,
        role: accessProfiles[index]?.role ?? admin.role?.key ?? null,
        status: deriveStatus(admin.deletedAt),
        lastActivityAt: lastActivityMap.get(admin.id) ?? null,
        createdAt: admin.createdAt.toISOString(),
        updatedAt: admin.updatedAt.toISOString(),
        deletedAt: toNullableIso(admin.deletedAt),
      })),
      pendingInvitations: pendingInvitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role.key,
        status: buildActiveInvitationStatus(invitation.expiresAt, invitation.acceptedAt),
        expiresAt: toNullableIso(invitation.expiresAt),
        createdAt: invitation.createdAt.toISOString(),
        invitedBy: invitation.invitedByAdmin
          ? {
              id: invitation.invitedByAdmin.id,
              email: invitation.invitedByAdmin.email,
            }
          : null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getAdminCase(id: string) {
    const admin = await this.prisma.adminModel.findFirst({
      where: { id },
      select: {
        id: true,
        email: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        role: {
          select: {
            id: true,
            key: true,
          },
        },
        adminSettings: {
          select: {
            id: true,
            theme: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
          },
        },
        permissionOverrides: {
          orderBy: [{ createdAt: `asc` }, { id: `asc` }],
          select: {
            granted: true,
            permission: {
              select: {
                capability: true,
              },
            },
          },
        },
        _count: {
          select: {
            consumerNotes: true,
            consumerFlags: true,
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException(`Admin not found`);
    }

    const [profile, recentAuditActions, recentAuthEvents, invitations] = await Promise.all([
      this.accessService.getAccessProfile({
        id: admin.id,
        email: admin.email,
        type: admin.type,
      }),
      this.prisma.adminActionAuditLogModel.findMany({
        where: { adminId: admin.id },
        include: {
          admin: {
            select: {
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        take: RECENT_ACTIVITY_LIMIT,
      }),
      this.prisma.authAuditLogModel.findMany({
        where: {
          identityType: `admin`,
          identityId: admin.id,
        },
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        take: RECENT_ACTIVITY_LIMIT,
        select: {
          id: true,
          event: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      this.prisma.adminInvitationModel.findMany({
        where: {
          OR: [{ email: admin.email }, { invitedBy: admin.id }],
        },
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        take: 10,
        select: {
          id: true,
          email: true,
          expiresAt: true,
          acceptedAt: true,
          createdAt: true,
          role: {
            select: {
              key: true,
            },
          },
        },
      }),
    ]);

    return {
      id: admin.id,
      core: {
        id: admin.id,
        email: admin.email,
        type: admin.type,
        role: profile.role ?? admin.role?.key ?? null,
        status: deriveStatus(admin.deletedAt),
        createdAt: admin.createdAt.toISOString(),
        deletedAt: toNullableIso(admin.deletedAt),
      },
      accessProfile: {
        source: profile.source,
        resolvedRole: profile.role,
        capabilities: profile.capabilities,
        workspaces: profile.workspaces,
        schemaRoleKey: admin.role?.key ?? null,
        availablePermissionCapabilities: [...OVERRIDABLE_ADMIN_V2_CAPABILITIES],
        permissionOverrides: admin.permissionOverrides
          .filter((override) => ADMIN_PERMISSION_OVERRIDE_CAPABILITIES.has(override.permission.capability))
          .map((override) => ({
            capability: override.permission.capability,
            granted: override.granted,
          })),
      },
      settings:
        admin.adminSettings && !admin.adminSettings.deletedAt
          ? {
              id: admin.adminSettings.id,
              theme: admin.adminSettings.theme,
              createdAt: admin.adminSettings.createdAt.toISOString(),
              updatedAt: admin.adminSettings.updatedAt.toISOString(),
            }
          : null,
      authoredNotesCount: admin._count.consumerNotes,
      authoredFlagsCount: admin._count.consumerFlags,
      recentAuditActions: recentAuditActions.map((action) => ({
        id: action.id,
        action: action.action,
        resource: action.resource,
        resourceId: action.resourceId,
        metadata: action.metadata ?? null,
        actorEmail: action.admin.email,
        createdAt: action.createdAt.toISOString(),
      })),
      recentAuthEvents: recentAuthEvents.map((event) => ({
        id: event.id,
        event: event.event,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        createdAt: event.createdAt.toISOString(),
      })),
      invitations: invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role.key,
        status: buildActiveInvitationStatus(invitation.expiresAt, invitation.acceptedAt),
        expiresAt: toNullableIso(invitation.expiresAt),
        acceptedAt: toNullableIso(invitation.acceptedAt),
        createdAt: invitation.createdAt.toISOString(),
      })),
      auditShortcuts: {
        adminActionsHref: `/audit/admin-actions?adminId=${encodeURIComponent(admin.id)}`,
        authHref: `/audit/auth?email=${encodeURIComponent(admin.email)}`,
      },
      version: deriveVersion(admin.updatedAt),
      updatedAt: admin.updatedAt.toISOString(),
      staleWarning: false,
      dataFreshnessClass: `exact`,
    };
  }

  async patchAdminPassword(targetAdminId: string, password: string, actorAdminId: string, meta: RequestMeta) {
    const { hash, salt } = await hashPassword(password);
    const updated = await this.prisma.adminModel.update({
      where: { id: targetAdminId },
      data: { password: hash, salt },
      select: {
        id: true,
        email: true,
        type: true,
        deletedAt: true,
        updatedAt: true,
      },
    });

    await this.recordAdminActionAudit({
      adminId: actorAdminId,
      action: ADMIN_ACTION_AUDIT_ACTIONS.admin_password_change,
      resourceId: updated.id,
      metadata: {
        targetEmail: updated.email,
      },
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    });

    return {
      adminId: updated.id,
      email: updated.email,
      type: updated.type,
      status: deriveStatus(updated.deletedAt),
      version: deriveVersion(updated.updatedAt),
    };
  }

  async updateAdminStatus(
    targetAdminId: string,
    action: `delete` | `restore`,
    actorAdminId: string,
    meta: RequestMeta,
  ) {
    const updated = await this.prisma.adminModel.update({
      where: { id: targetAdminId },
      data: {
        deletedAt: action === `delete` ? new Date() : null,
      },
      select: {
        id: true,
        email: true,
        deletedAt: true,
        updatedAt: true,
      },
    });

    await this.recordAdminActionAudit({
      adminId: actorAdminId,
      action: action === `delete` ? ADMIN_ACTION_AUDIT_ACTIONS.admin_delete : ADMIN_ACTION_AUDIT_ACTIONS.admin_restore,
      resourceId: updated.id,
      metadata: {
        targetEmail: updated.email,
      },
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    });

    return {
      adminId: updated.id,
      status: deriveStatus(updated.deletedAt),
      deletedAt: toNullableIso(updated.deletedAt),
      version: deriveVersion(updated.updatedAt),
    };
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
        const inviteUrl = new URL(`/accept-invite`, this.resolveAdminV2Origin());
        inviteUrl.searchParams.set(`token`, token);
        const notificationSent = await this.trySendInvitationEmail({
          email,
          signupLink: inviteUrl.toString(),
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
            } as Prisma.InputJsonValue,
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

    await this.sendAdminV2PasswordResetEmail({
      email: admin.email,
      token,
      auditId: created.auditId,
      metadata: {
        targetEmail: admin.email,
        initiatedBy: `self_service`,
      },
    });
  }

  async deactivateAdmin(
    targetAdminId: string,
    actorAdminId: string,
    body: { version?: number; confirmed?: boolean; reason?: string | null },
    meta: RequestMeta,
  ) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for admin deactivation`);
    }
    if (targetAdminId === actorAdminId) {
      throw new ConflictException(`You cannot deactivate your own admin account`);
    }

    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }
    const reason = normalizeReason(body.reason);

    return this.idempotency.execute({
      adminId: actorAdminId,
      scope: `admin-deactivate:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: {
        targetAdminId,
        expectedVersion,
        confirmed: true,
        reason,
      },
      execute: async () => {
        const target = await this.prisma.adminModel.findUnique({
          where: { id: targetAdminId },
          select: {
            id: true,
            email: true,
            deletedAt: true,
            updatedAt: true,
          },
        });
        if (!target) {
          throw new NotFoundException(`Admin not found`);
        }
        if (deriveVersion(target.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(target.updatedAt));
        }
        if (target.deletedAt) {
          return {
            adminId: target.id,
            status: `INACTIVE`,
            deletedAt: target.deletedAt.toISOString(),
            version: deriveVersion(target.updatedAt),
            alreadyInactive: true,
          };
        }

        return this.prisma.$transaction(async (tx) => {
          const deactivatedAt = new Date();
          const updated = await tx.adminModel.updateMany({
            where: {
              id: target.id,
              deletedAt: null,
              updatedAt: target.updatedAt,
            },
            data: {
              deletedAt: deactivatedAt,
            },
          });
          if (updated.count === 0) {
            const current = await tx.adminModel.findUnique({
              where: { id: target.id },
              select: { updatedAt: true },
            });
            throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Admin has changed`);
          }
          await tx.adminAuthSessionModel.updateMany({
            where: {
              adminId: target.id,
              revokedAt: null,
            },
            data: {
              revokedAt: deactivatedAt,
              invalidatedReason: ADMIN_AUTH_SESSION_REVOKE_REASONS.admin_deactivated,
              lastUsedAt: deactivatedAt,
            },
          });
          await tx.accessRefreshTokenModel.deleteMany({
            where: {
              identityId: target.id,
            },
          });
          await tx.adminActionAuditLogModel.create({
            data: {
              adminId: actorAdminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.admin_deactivate,
              resource: `admin`,
              resourceId: target.id,
              metadata: {
                targetEmail: target.email,
                confirmed: true,
                reason,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });
          const fresh = await tx.adminModel.findUniqueOrThrow({
            where: { id: target.id },
            select: {
              id: true,
              updatedAt: true,
              deletedAt: true,
            },
          });
          return {
            adminId: fresh.id,
            status: `INACTIVE`,
            deletedAt: fresh.deletedAt?.toISOString() ?? deactivatedAt.toISOString(),
            version: deriveVersion(fresh.updatedAt),
            alreadyInactive: false,
          };
        });
      },
    });
  }

  async restoreAdmin(targetAdminId: string, actorAdminId: string, body: { version?: number }, meta: RequestMeta) {
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }

    return this.idempotency.execute({
      adminId: actorAdminId,
      scope: `admin-restore:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: { targetAdminId, expectedVersion },
      execute: async () => {
        const target = await this.prisma.adminModel.findUnique({
          where: { id: targetAdminId },
          select: {
            id: true,
            email: true,
            deletedAt: true,
            updatedAt: true,
          },
        });
        if (!target) {
          throw new NotFoundException(`Admin not found`);
        }
        if (deriveVersion(target.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(target.updatedAt));
        }
        if (!target.deletedAt) {
          return {
            adminId: target.id,
            status: `ACTIVE`,
            version: deriveVersion(target.updatedAt),
            alreadyActive: true,
          };
        }

        return this.prisma.$transaction(async (tx) => {
          const updated = await tx.adminModel.updateMany({
            where: {
              id: target.id,
              deletedAt: { not: null },
              updatedAt: target.updatedAt,
            },
            data: {
              deletedAt: null,
            },
          });
          if (updated.count === 0) {
            const current = await tx.adminModel.findUnique({
              where: { id: target.id },
              select: { updatedAt: true },
            });
            throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Admin has changed`);
          }
          await tx.adminActionAuditLogModel.create({
            data: {
              adminId: actorAdminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.admin_restore,
              resource: `admin`,
              resourceId: target.id,
              metadata: {
                targetEmail: target.email,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });
          const fresh = await tx.adminModel.findUniqueOrThrow({
            where: { id: target.id },
            select: {
              id: true,
              updatedAt: true,
              deletedAt: true,
            },
          });
          return {
            adminId: fresh.id,
            status: `ACTIVE`,
            deletedAt: toNullableIso(fresh.deletedAt),
            version: deriveVersion(fresh.updatedAt),
            alreadyActive: false,
          };
        });
      },
    });
  }

  async changeAdminRole(
    targetAdminId: string,
    actorAdminId: string,
    body: { version?: number; confirmed?: boolean; roleKey?: string },
    meta: RequestMeta,
  ) {
    if (body.confirmed !== true) {
      throw new BadRequestException(`Confirmation is required for admin role change`);
    }
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }
    const nextRoleKey = String(body.roleKey ?? ``).trim();
    if (!ALLOWED_ROLE_KEYS.has(nextRoleKey)) {
      throw new BadRequestException(`Unsupported admin role`);
    }

    return this.idempotency.execute({
      adminId: actorAdminId,
      scope: `admin-role-change:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: {
        targetAdminId,
        expectedVersion,
        confirmed: true,
        nextRoleKey,
      },
      execute: async () => {
        const target = await this.prisma.adminModel.findUnique({
          where: { id: targetAdminId },
          select: {
            id: true,
            email: true,
            type: true,
            updatedAt: true,
            deletedAt: true,
            role: {
              select: {
                id: true,
                key: true,
              },
            },
          },
        });
        if (!target) {
          throw new NotFoundException(`Admin not found`);
        }
        if (deriveVersion(target.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(target.updatedAt));
        }
        if (target.deletedAt) {
          throw new ConflictException(`Inactive admins cannot change roles until restored`);
        }
        if (target.role?.key === nextRoleKey) {
          return {
            adminId: target.id,
            roleKey: nextRoleKey,
            version: deriveVersion(target.updatedAt),
            alreadyApplied: true,
          };
        }

        const nextRole = await this.prisma.adminRoleModel.findFirst({
          where: { key: nextRoleKey },
          select: { id: true, key: true },
        });
        if (!nextRole) {
          throw new BadRequestException(`Target role is unavailable`);
        }

        return this.prisma.$transaction(async (tx) => {
          const updated = await tx.adminModel.updateMany({
            where: {
              id: target.id,
              updatedAt: target.updatedAt,
              deletedAt: null,
            },
            data: {
              roleId: nextRole.id,
              type: toAdminType(nextRole.key),
            },
          });
          if (updated.count === 0) {
            const current = await tx.adminModel.findUnique({
              where: { id: target.id },
              select: { updatedAt: true },
            });
            throw new ConflictException(current ? buildStaleVersionPayload(current.updatedAt) : `Admin has changed`);
          }
          await tx.adminActionAuditLogModel.create({
            data: {
              adminId: actorAdminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.admin_role_change,
              resource: `admin`,
              resourceId: target.id,
              metadata: {
                targetEmail: target.email,
                confirmed: true,
                previousRoleKey: target.role?.key ?? null,
                nextRoleKey,
                previousType: target.type,
                nextType: toAdminType(nextRole.key),
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });
          const fresh = await tx.adminModel.findUniqueOrThrow({
            where: { id: target.id },
            select: {
              updatedAt: true,
              role: {
                select: {
                  key: true,
                },
              },
            },
          });
          return {
            adminId: target.id,
            roleKey: fresh.role?.key ?? nextRoleKey,
            version: deriveVersion(fresh.updatedAt),
            alreadyApplied: false,
          };
        });
      },
    });
  }

  async changeAdminPermissions(
    targetAdminId: string,
    actorAdminId: string,
    body: { version?: number; capabilityOverrides?: Array<{ capability: string; mode: string }> },
    meta: RequestMeta,
  ) {
    const expectedVersion = Number(body.version);
    if (!Number.isFinite(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(`Valid version is required`);
    }
    const requestedOverrides = Array.isArray(body.capabilityOverrides) ? body.capabilityOverrides : [];
    const normalizedOverrides = requestedOverrides.map((override) => {
      const capability = String(override.capability ?? ``).trim();
      const mode = String(override.mode ?? ``).trim() as AdminPermissionOverrideMode;
      return {
        capability,
        mode,
      };
    });
    if (
      normalizedOverrides.some(
        (override) =>
          !override.capability ||
          !ADMIN_PERMISSION_OVERRIDE_CAPABILITIES.has(override.capability) ||
          !ADMIN_PERMISSION_OVERRIDE_MODES.has(override.mode),
      )
    ) {
      throw new BadRequestException(`Only known admin-v2 capability overrides are supported`);
    }

    return this.idempotency.execute({
      adminId: actorAdminId,
      scope: `admin-permissions-change:${targetAdminId}`,
      key: meta.idempotencyKey,
      payload: {
        targetAdminId,
        expectedVersion,
        normalizedOverrides,
      },
      execute: async () => {
        const target = await this.prisma.adminModel.findUnique({
          where: { id: targetAdminId },
          select: {
            id: true,
            email: true,
            updatedAt: true,
            deletedAt: true,
            permissionOverrides: {
              select: {
                id: true,
                granted: true,
                permissionId: true,
                permission: {
                  select: {
                    capability: true,
                  },
                },
              },
            },
          },
        });
        if (!target) {
          throw new NotFoundException(`Admin not found`);
        }
        if (deriveVersion(target.updatedAt) !== expectedVersion) {
          throw new ConflictException(buildStaleVersionPayload(target.updatedAt));
        }
        if (target.deletedAt) {
          throw new ConflictException(`Inactive admins cannot change permission overrides until restored`);
        }

        const relevantPermissions = await this.prisma.adminPermissionModel.findMany({
          where: {
            capability: { in: [...ADMIN_PERMISSION_OVERRIDE_CAPABILITIES] },
          },
          select: {
            id: true,
            capability: true,
          },
        });
        const permissionIdByCapability = new Map(
          relevantPermissions.map((permission) => [permission.capability, permission.id]),
        );
        if (normalizedOverrides.some((override) => !permissionIdByCapability.has(override.capability))) {
          throw new BadRequestException(`One or more requested capabilities are unavailable`);
        }

        const currentOverrideMap = new Map(
          target.permissionOverrides
            .filter((override) => ADMIN_PERMISSION_OVERRIDE_CAPABILITIES.has(override.permission.capability))
            .map((override) => [override.permission.capability, override.granted]),
        );
        const nextOverrideMap = new Map<string, boolean | null>();
        for (const override of normalizedOverrides) {
          nextOverrideMap.set(override.capability, toPermissionOverrideGrant(override.mode));
        }
        const changes = [...ADMIN_PERMISSION_OVERRIDE_CAPABILITIES].flatMap((capability) => {
          const current = currentOverrideMap.has(capability) ? currentOverrideMap.get(capability)! : null;
          const next = nextOverrideMap.has(capability) ? nextOverrideMap.get(capability)! : null;
          return current === next ? [] : [{ capability, previous: current, next }];
        });
        if (changes.length === 0) {
          return {
            adminId: target.id,
            version: deriveVersion(target.updatedAt),
            overrides: normalizedOverrides,
            alreadyApplied: true,
          };
        }

        return this.prisma.$transaction(async (tx) => {
          const touchedPermissionIds = [
            ...new Set(normalizedOverrides.map((override) => permissionIdByCapability.get(override.capability)!)),
          ];
          await tx.adminPermissionOverrideModel.deleteMany({
            where: {
              adminId: target.id,
              permissionId: { in: touchedPermissionIds },
            },
          });
          const explicitOverrides = normalizedOverrides.filter((override) => override.mode !== `inherit`);
          if (explicitOverrides.length > 0) {
            await tx.adminPermissionOverrideModel.createMany({
              data: explicitOverrides.map((override) => ({
                adminId: target.id,
                permissionId: permissionIdByCapability.get(override.capability)!,
                granted: override.mode === `grant`,
              })),
            });
          }

          await tx.adminModel.updateMany({
            where: {
              id: target.id,
              updatedAt: target.updatedAt,
            },
            data: {
              updatedAt: new Date(),
            },
          });

          await tx.adminActionAuditLogModel.create({
            data: {
              adminId: actorAdminId,
              action: ADMIN_ACTION_AUDIT_ACTIONS.admin_permissions_change,
              resource: `admin`,
              resourceId: target.id,
              metadata: {
                targetEmail: target.email,
                changes,
              },
              ipAddress: meta.ipAddress ?? null,
              userAgent: meta.userAgent ?? null,
            },
          });
          const fresh = await tx.adminModel.findUniqueOrThrow({
            where: { id: target.id },
            select: {
              updatedAt: true,
              permissionOverrides: {
                select: {
                  granted: true,
                  permission: {
                    select: {
                      capability: true,
                    },
                  },
                },
              },
            },
          });
          return {
            adminId: target.id,
            version: deriveVersion(fresh.updatedAt),
            overrides: fresh.permissionOverrides
              .filter((override) => ADMIN_PERMISSION_OVERRIDE_CAPABILITIES.has(override.permission.capability))
              .map((override) => ({
                capability: override.permission.capability,
                granted: override.granted,
              })),
            alreadyApplied: false,
          };
        });
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
        const { notificationSent, deliveryStatus } = await this.sendAdminV2PasswordResetEmail({
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
