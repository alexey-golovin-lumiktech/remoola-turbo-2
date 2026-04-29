import { Injectable, NotFoundException } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';
import { OVERRIDABLE_ADMIN_V2_CAPABILITIES } from '../admin-v2-access';
import { AdminV2AccessService } from '../admin-v2-access.service';
import {
  ADMIN_PERMISSION_OVERRIDE_CAPABILITIES,
  RECENT_ACTIVITY_LIMIT,
  buildActiveInvitationStatus,
  deriveStatus,
  deriveVersion,
  normalizePage,
  normalizePageSize,
  toNullableIso,
} from './admin-v2-admins.utils';

@Injectable()
export class AdminV2AdminsQueriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  async buildLastActivityMap(adminIds: string[]): Promise<Map<string, string | null>> {
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
}
