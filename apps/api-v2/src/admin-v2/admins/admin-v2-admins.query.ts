import { Injectable } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2AdminsQuery {
  constructor(private readonly prisma: PrismaService) {}

  listAdminsPage(params: { where: Prisma.AdminModelWhereInput; skip: number; take: number }) {
    const { where, skip, take } = params;

    return Promise.all([
      this.prisma.adminModel.findMany({
        where,
        orderBy: [{ deletedAt: `asc` }, { updatedAt: `desc` }, { id: `desc` }],
        skip,
        take,
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
      this.prisma.adminModel.count({ where }),
    ]);
  }

  listPendingInvitations(take: number) {
    return this.prisma.adminInvitationModel.findMany({
      where: {
        acceptedAt: null,
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take,
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
    });
  }

  findAdminCaseBase(id: string) {
    return this.prisma.adminModel.findFirst({
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
  }

  listRelatedInvitations(params: { adminId: string; email: string; take: number }) {
    const { adminId, email, take } = params;

    return this.prisma.adminInvitationModel.findMany({
      where: {
        OR: [{ email }, { invitedBy: adminId }],
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take,
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
    });
  }
}
