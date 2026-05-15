import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { PrismaService } from '../../shared/prisma.service';

const queueConsumerSelect = Prisma.validator<Prisma.ConsumerModelSelect>()({
  id: true,
  email: true,
  accountType: true,
  contractorKind: true,
  verificationStatus: true,
  stripeIdentityStatus: true,
  createdAt: true,
  updatedAt: true,
  verificationUpdatedAt: true,
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
  addressDetails: {
    select: {
      country: true,
    },
  },
  _count: {
    select: {
      consumerResources: {
        where: { deletedAt: null, resource: { deletedAt: null } },
      },
    },
  },
});

const decisionHistorySelect = Prisma.validator<Prisma.AdminActionAuditLogModelSelect>()({
  id: true,
  action: true,
  metadata: true,
  createdAt: true,
  adminId: true,
  admin: {
    select: {
      email: true,
    },
  },
});

const verificationSlaCandidateSelect = Prisma.validator<Prisma.ConsumerModelSelect>()({
  id: true,
  createdAt: true,
  verificationUpdatedAt: true,
});

export type AdminV2VerificationQueueRow = Prisma.ConsumerModelGetPayload<{
  select: typeof queueConsumerSelect;
}>;

export type AdminV2VerificationDecisionHistoryRow = Prisma.AdminActionAuditLogModelGetPayload<{
  select: typeof decisionHistorySelect;
}>;

export type AdminV2VerificationSlaCandidateRow = Prisma.ConsumerModelGetPayload<{
  select: typeof verificationSlaCandidateSelect;
}>;

type AdminV2VerificationQueueQueryParams = {
  statuses: Array<$Enums.VerificationStatus>;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
};

function buildQueueWhere(params: AdminV2VerificationQueueQueryParams): Prisma.ConsumerModelWhereInput {
  return {
    deletedAt: null,
    verificationStatus: {
      in: params.statuses,
    },
    ...(params.stripeIdentityStatus ? { stripeIdentityStatus: params.stripeIdentityStatus } : {}),
    ...(params.contractorKind ? { contractorKind: params.contractorKind as $Enums.ContractorKind } : {}),
    ...(params.country ? { addressDetails: { is: { country: params.country } } } : {}),
  };
}

@Injectable()
export class AdminV2VerificationQuery {
  constructor(private readonly prisma: PrismaService) {}

  listActiveVerificationSlaCandidates(): Promise<AdminV2VerificationSlaCandidateRow[]> {
    return this.prisma.consumerModel.findMany({
      where: {
        deletedAt: null,
        verificationStatus: {
          in: [
            $Enums.VerificationStatus.PENDING,
            $Enums.VerificationStatus.MORE_INFO,
            $Enums.VerificationStatus.FLAGGED,
          ],
        },
      },
      select: verificationSlaCandidateSelect,
    });
  }

  getQueueRows(params: AdminV2VerificationQueueQueryParams) {
    return this.prisma.consumerModel.findMany({
      where: buildQueueWhere(params),
      orderBy: [{ verificationUpdatedAt: `asc` }, { createdAt: `asc` }],
      select: queueConsumerSelect,
    });
  }

  getQueueCountRows(params: AdminV2VerificationQueueQueryParams) {
    return this.prisma.consumerModel.findMany({
      where: buildQueueWhere(params),
      select: queueConsumerSelect,
    });
  }

  countQueue(params: AdminV2VerificationQueueQueryParams) {
    return this.prisma.consumerModel.count({
      where: buildQueueWhere(params),
    });
  }

  getDecisionHistory(consumerId: string) {
    return this.prisma.adminActionAuditLogModel.findMany({
      where: {
        resource: `consumer`,
        resourceId: consumerId,
        action: {
          in: [`verification_approve`, `verification_reject`, `verification_request_info`, `verification_flag`],
        },
      },
      orderBy: { createdAt: `desc` },
      take: 20,
      select: decisionHistorySelect,
    });
  }

  async getAuthRiskContext(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });
    if (!consumer) {
      return null;
    }

    const normalizedEmail = consumer.email.toLowerCase();
    const failuresSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const refreshReuseSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [loginFailures24h, refreshReuse30d, recentEvents] = await Promise.all([
      this.prisma.authAuditLogModel.count({
        where: {
          identityType: AUTH_IDENTITY_TYPES.consumer,
          OR: [{ identityId: consumerId }, { email: normalizedEmail }],
          event: AUTH_AUDIT_EVENTS.login_failure,
          createdAt: { gte: failuresSince },
        },
      }),
      this.prisma.authAuditLogModel.count({
        where: {
          identityType: AUTH_IDENTITY_TYPES.consumer,
          OR: [{ identityId: consumerId }, { email: normalizedEmail }],
          event: AUTH_AUDIT_EVENTS.refresh_reuse,
          createdAt: { gte: refreshReuseSince },
        },
      }),
      this.prisma.authAuditLogModel.findMany({
        where: {
          identityType: AUTH_IDENTITY_TYPES.consumer,
          OR: [{ identityId: consumerId }, { email: normalizedEmail }],
        },
        orderBy: { createdAt: `desc` },
        take: 10,
      }),
    ]);

    return {
      loginFailures24h,
      refreshReuse30d,
      recentEvents,
    };
  }
}
