import { Injectable } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';

import { ACCOUNT_TYPES, CONTRACTOR_KINDS, VERIFICATION_STATUSES } from './admin-v2-consumer-query-helpers';
import { PrismaService } from '../../shared/prisma.service';

const SEARCH_MAX_LEN = 200;

export type AdminV2ConsumerListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  accountType?: string;
  contractorKind?: string;
  verificationStatus?: string;
  includeDeleted?: boolean;
};

@Injectable()
export class AdminV2ConsumerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSummaryById(consumerId: string) {
    return this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: {
        id: true,
        email: true,
        suspendedAt: true,
        suspendedBy: true,
        suspensionReason: true,
      },
    });
  }

  private buildListWhere(params?: AdminV2ConsumerListParams): Prisma.ConsumerModelWhereInput {
    const search =
      typeof params?.q === `string` && params.q.trim().length > 0
        ? params.q.trim().slice(0, SEARCH_MAX_LEN)
        : undefined;
    const accountType =
      params?.accountType && ACCOUNT_TYPES.includes(params.accountType)
        ? (params.accountType as $Enums.AccountType)
        : undefined;
    const contractorKind =
      params?.contractorKind && CONTRACTOR_KINDS.includes(params.contractorKind)
        ? (params.contractorKind as $Enums.ContractorKind)
        : undefined;
    const verificationStatus =
      params?.verificationStatus && VERIFICATION_STATUSES.includes(params.verificationStatus)
        ? (params.verificationStatus as $Enums.VerificationStatus)
        : undefined;

    return {
      ...(params?.includeDeleted === true ? {} : { deletedAt: null }),
      ...(accountType ? { accountType } : {}),
      ...(contractorKind ? { contractorKind } : {}),
      ...(verificationStatus ? { verificationStatus } : {}),
      ...(search
        ? {
            OR: [
              { id: { equals: search } },
              { email: { contains: search, mode: `insensitive` } },
              { personalDetails: { firstName: { contains: search, mode: `insensitive` } } },
              { personalDetails: { lastName: { contains: search, mode: `insensitive` } } },
              { organizationDetails: { name: { contains: search, mode: `insensitive` } } },
            ],
          }
        : {}),
    };
  }

  async list(params: AdminV2ConsumerListParams | undefined, skip: number, take: number) {
    const where = this.buildListWhere(params);
    const [items, total] = await Promise.all([this.findMany(where, skip, take), this.count(where)]);
    return { items, total };
  }

  private findMany(where: Prisma.ConsumerModelWhereInput, skip: number, take: number) {
    return this.prisma.consumerModel.findMany({
      where,
      orderBy: { createdAt: `desc` },
      skip,
      take,
      select: {
        id: true,
        email: true,
        accountType: true,
        contractorKind: true,
        verificationStatus: true,
        stripeIdentityStatus: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        personalDetails: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        organizationDetails: {
          select: {
            name: true,
          },
        },
        adminFlags: {
          where: { removedAt: null },
          orderBy: { createdAt: `desc` },
          take: 3,
          select: {
            id: true,
            flag: true,
          },
        },
        _count: {
          select: {
            adminNotes: true,
            adminFlags: {
              where: { removedAt: null },
            },
          },
        },
      },
    });
  }

  private count(where: Prisma.ConsumerModelWhereInput) {
    return this.prisma.consumerModel.count({ where });
  }

  countActiveSessions(consumerId: string) {
    return this.prisma.authSessionModel.count({
      where: { consumerId, revokedAt: null },
    });
  }

  suspendIfActive(consumerId: string, adminId: string, reason: string, suspendedAt: Date) {
    return this.prisma.consumerModel.updateMany({
      where: {
        id: consumerId,
        suspendedAt: null,
      },
      data: {
        suspendedAt,
        suspendedBy: adminId,
        suspensionReason: reason,
      },
    });
  }
}
