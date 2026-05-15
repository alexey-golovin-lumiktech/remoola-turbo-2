import { Injectable } from '@nestjs/common';

import { Prisma, type Prisma as PrismaNamespace } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

const adminByEmailSelect = Prisma.validator<PrismaNamespace.AdminModelSelect>()({
  id: true,
  deletedAt: true,
});

const roleSelect = Prisma.validator<PrismaNamespace.AdminRoleModelSelect>()({
  id: true,
  key: true,
});

const pendingInvitationSelect = Prisma.validator<PrismaNamespace.AdminInvitationModelSelect>()({
  id: true,
  email: true,
  expiresAt: true,
  createdAt: true,
});

const invitationAcceptSelect = Prisma.validator<PrismaNamespace.AdminInvitationModelSelect>()({
  id: true,
  email: true,
  roleId: true,
  expiresAt: true,
  acceptedAt: true,
});

@Injectable()
export class AdminV2AdminInvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getAdminByEmail(email: string) {
    return this.prisma.adminModel.findFirst({
      where: { email },
      select: adminByEmailSelect,
    });
  }

  getRoleByKey(roleKey: string) {
    return this.prisma.adminRoleModel.findFirst({
      where: { key: roleKey },
      select: roleSelect,
    });
  }

  getRoleById(roleId: string) {
    return this.prisma.adminRoleModel.findUnique({
      where: { id: roleId },
      select: { key: true },
    });
  }

  getPendingInvitation(email: string, roleId: string) {
    return this.prisma.adminInvitationModel.findFirst({
      where: {
        email,
        roleId,
        acceptedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      select: pendingInvitationSelect,
    });
  }

  createInvitation(
    tx: PrismaNamespace.TransactionClient,
    params: {
      email: string;
      roleId: string;
      actorAdminId: string;
      expiresAt: Date;
    },
  ) {
    return tx.adminInvitationModel.create({
      data: {
        email: params.email,
        roleId: params.roleId,
        invitedBy: params.actorAdminId,
        expiresAt: params.expiresAt,
      },
      select: pendingInvitationSelect,
    });
  }

  createInvitationAuditEntry(
    tx: PrismaNamespace.TransactionClient,
    params: {
      actorAdminId: string;
      invitationId: string;
      email: string;
      roleKey: string;
      expiresAt: Date;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
  ) {
    return tx.adminActionAuditLogModel.create({
      data: {
        adminId: params.actorAdminId,
        action: `admin_invite`,
        resource: `admin_invitation`,
        resourceId: params.invitationId,
        metadata: {
          invitedEmail: params.email,
          roleKey: params.roleKey,
          expiresAt: params.expiresAt.toISOString(),
          notificationSent: false,
          notificationType: `email`,
          deliveryStatus: `pending`,
        },
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
      select: {
        id: true,
      },
    });
  }

  updateInvitationAuditDelivery(params: {
    auditId: string;
    invitedEmail: string;
    roleKey: string;
    expiresAt: string;
    notificationSent: boolean;
  }) {
    const { auditId, invitedEmail, roleKey, expiresAt, notificationSent } = params;

    return this.prisma.adminActionAuditLogModel.update({
      where: { id: auditId },
      data: {
        metadata: {
          invitedEmail,
          roleKey,
          expiresAt,
          notificationSent,
          notificationType: `email`,
          deliveryStatus: notificationSent ? `sent` : `failed`,
        } as PrismaNamespace.InputJsonValue,
      },
    });
  }

  getInvitationForAcceptance(invitationId: string) {
    return this.prisma.adminInvitationModel.findUnique({
      where: { id: invitationId },
      select: invitationAcceptSelect,
    });
  }

  consumeInvitation(tx: PrismaNamespace.TransactionClient, invitationId: string) {
    return tx.adminInvitationModel.updateMany({
      where: {
        id: invitationId,
        acceptedAt: null,
      },
      data: {
        acceptedAt: new Date(),
      },
    });
  }

  createAdminFromInvitation(
    tx: PrismaNamespace.TransactionClient,
    params: {
      email: string;
      roleId: string;
      hash: string;
      salt: string;
      type: PrismaNamespace.AdminModelCreateInput[`type`];
    },
  ) {
    return tx.adminModel.create({
      data: {
        email: params.email,
        password: params.hash,
        salt: params.salt,
        roleId: params.roleId,
        type: params.type,
      },
      select: {
        id: true,
        email: true,
      },
    });
  }
}
