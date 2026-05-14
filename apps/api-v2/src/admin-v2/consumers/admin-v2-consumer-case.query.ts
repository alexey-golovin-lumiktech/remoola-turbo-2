import { Injectable, NotFoundException } from '@nestjs/common';

import { AdminV2ConsumerLedgerQuery } from './admin-v2-consumer-ledger.query';
import { mapPaymentMethodStatus } from './admin-v2-consumer-query-helpers';
import { normalizeConsumerFacingTransactionStatus } from '../../consumer/consumer-status-compat';
import { AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
// Read-side query for consumer case projections only.
// This class intentionally stays Prisma-backed and read-only.
export class AdminV2ConsumerCaseQuery {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consumerLedgerQuery: AdminV2ConsumerLedgerQuery,
  ) {}

  async getConsumerCase(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: {
        id: true,
        email: true,
        accountType: true,
        contractorKind: true,
        verified: true,
        legalVerified: true,
        verificationStatus: true,
        verificationReason: true,
        verificationUpdatedAt: true,
        suspendedAt: true,
        suspendedBy: true,
        suspensionReason: true,
        stripeIdentityStatus: true,
        stripeIdentityLastErrorCode: true,
        stripeIdentityLastErrorReason: true,
        stripeIdentityStartedAt: true,
        stripeIdentityUpdatedAt: true,
        stripeIdentityVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        personalDetails: true,
        organizationDetails: true,
        addressDetails: true,
        googleProfileDetails: true,
        contacts: {
          where: { deletedAt: null },
          orderBy: { updatedAt: `desc` },
          take: 20,
          select: {
            id: true,
            email: true,
            name: true,
            updatedAt: true,
          },
        },
        paymentMethods: {
          where: { deletedAt: null },
          take: 10,
          orderBy: { createdAt: `desc` },
          select: {
            id: true,
            type: true,
            brand: true,
            last4: true,
            defaultSelected: true,
            createdAt: true,
            updatedAt: true,
            disabledAt: true,
          },
        },
        asPayerPaymentRequests: {
          where: { deletedAt: null },
          orderBy: [{ updatedAt: `desc` }, { createdAt: `desc` }],
          take: 5,
          select: {
            id: true,
            amount: true,
            currencyCode: true,
            status: true,
            paymentRail: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        asRequesterPaymentRequests: {
          where: { deletedAt: null },
          orderBy: [{ updatedAt: `desc` }, { createdAt: `desc` }],
          take: 5,
          select: {
            id: true,
            amount: true,
            currencyCode: true,
            status: true,
            paymentRail: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        consumerResources: {
          where: { deletedAt: null, resource: { deletedAt: null } },
          take: 20,
          orderBy: { createdAt: `desc` },
          select: {
            id: true,
            createdAt: true,
            resource: {
              select: {
                id: true,
                originalName: true,
                mimetype: true,
                size: true,
                downloadUrl: true,
                createdAt: true,
              },
            },
          },
        },
        adminNotes: {
          orderBy: { createdAt: `desc` },
          take: 20,
          select: {
            id: true,
            content: true,
            createdAt: true,
            admin: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        adminFlags: {
          where: { removedAt: null },
          orderBy: { createdAt: `desc` },
          select: {
            id: true,
            flag: true,
            reason: true,
            version: true,
            createdAt: true,
            admin: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            contacts: true,
            paymentMethods: {
              where: { deletedAt: null },
            },
            asPayerPaymentRequests: {
              where: { deletedAt: null },
            },
            asRequesterPaymentRequests: {
              where: { deletedAt: null },
            },
            ledgerEntries: {
              where: { deletedAt: null },
            },
            consumerResources: {
              where: { deletedAt: null },
            },
            adminNotes: true,
            adminFlags: {
              where: { removedAt: null },
            },
          },
        },
      },
    });

    if (!consumer) {
      throw new NotFoundException(`Consumer not found`);
    }

    const [recentAuthEvents, recentAdminActions, recentConsumerActions, ledgerSummary] = await Promise.all([
      this.prisma.authAuditLogModel.findMany({
        where: {
          identityType: AUTH_IDENTITY_TYPES.consumer,
          OR: [{ identityId: consumerId }, { email: consumer.email.toLowerCase() }],
        },
        orderBy: { createdAt: `desc` },
        take: 10,
      }),
      this.prisma.adminActionAuditLogModel.findMany({
        where: {
          resource: `consumer`,
          resourceId: consumerId,
        },
        include: {
          admin: {
            select: {
              email: true,
            },
          },
        },
        orderBy: { createdAt: `desc` },
        take: 10,
      }),
      this.prisma.consumerActionLogModel.findMany({
        where: { consumerId },
        orderBy: { createdAt: `desc` },
        take: 10,
      }),
      this.consumerLedgerQuery.getLedgerSummary(consumerId),
    ]);

    const recentPaymentRequests = [...consumer.asPayerPaymentRequests, ...consumer.asRequesterPaymentRequests]
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, 10)
      .map((paymentRequest) => ({
        id: paymentRequest.id,
        amount: paymentRequest.amount.toString(),
        currencyCode: paymentRequest.currencyCode,
        status: normalizeConsumerFacingTransactionStatus(paymentRequest.status),
        paymentRail: paymentRequest.paymentRail,
        createdAt: paymentRequest.createdAt,
      }));

    return {
      ...consumer,
      paymentMethods: consumer.paymentMethods.map((paymentMethod) => ({
        ...paymentMethod,
        status: mapPaymentMethodStatus(paymentMethod),
      })),
      recentPaymentRequests,
      ledgerSummary: ledgerSummary.summary,
      recentAuthEvents,
      recentAdminActions: recentAdminActions.map((row) => ({
        id: row.id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resourceId,
        metadata: row.metadata,
        createdAt: row.createdAt,
        adminId: row.adminId,
        adminEmail: row.admin?.email ?? null,
      })),
      recentConsumerActions,
    };
  }
}
