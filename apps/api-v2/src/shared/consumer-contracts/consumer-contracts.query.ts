import { Injectable } from '@nestjs/common';

import {
  buildConsumerContractPaymentParticipantIdsSql,
  buildConsumerContractPaymentsWhere,
} from './consumer-contract-query-helpers';
import {
  buildContractListPageResult,
  buildEmptyContractListPageResult,
  type ContractListCountRow,
  type ContractListRow,
} from './consumer-contracts.mapper';
import {
  buildConsumerContractsDocumentsFilterSql,
  buildConsumerContractsMatchedPaymentsSql,
  buildConsumerContractsOrderBySql,
  buildConsumerContractsPageSql,
  buildConsumerContractsPaymentsFilterSql,
  buildConsumerContractsRecountSql,
  buildConsumerContractsSearchSql,
  buildConsumerContractsStatusFilterSql,
} from './consumer-contracts.sql';
import { type ConsumerContractItem } from './dto';
import { PrismaService } from '../prisma.service';

type ContractsRawParams = {
  consumerId: string;
  safePage: number;
  safePageSize: number;
  term: string;
  normalizedStatusFilter: string | null;
  normalizedHasDocumentsFilter: `yes` | `no` | null;
  normalizedHasPaymentsFilter: `yes` | `no` | null;
  normalizedSort: `recent_activity` | `name` | `payments_count`;
};

@Injectable()
export class ConsumerContractsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async getConsumerEmail(consumerId: string): Promise<string | null> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });

    return consumer?.email?.trim().toLowerCase() ?? null;
  }

  async getContractsRaw(params: ContractsRawParams): Promise<{
    items: ConsumerContractItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      consumerId,
      safePage,
      safePageSize,
      term,
      normalizedStatusFilter,
      normalizedHasDocumentsFilter,
      normalizedHasPaymentsFilter,
      normalizedSort,
    } = params;
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const offset = (safePage - 1) * safePageSize;
    const searchSql = buildConsumerContractsSearchSql(term);
    const participantPaymentIdsSql = buildConsumerContractPaymentParticipantIdsSql(consumerId, consumerEmail);
    const statusFilterSql = buildConsumerContractsStatusFilterSql(normalizedStatusFilter);
    const documentsFilterSql = buildConsumerContractsDocumentsFilterSql(normalizedHasDocumentsFilter);
    const paymentsFilterSql = buildConsumerContractsPaymentsFilterSql(normalizedHasPaymentsFilter);
    const orderBySql = buildConsumerContractsOrderBySql(normalizedSort);
    const matchedPaymentsSql = buildConsumerContractsMatchedPaymentsSql(consumerId);

    const rows = await this.prisma.$queryRaw<ContractListRow[]>(
      buildConsumerContractsPageSql({
        consumerId,
        participantPaymentIdsSql,
        searchSql,
        matchedPaymentsSql,
        statusFilterSql,
        documentsFilterSql,
        paymentsFilterSql,
        orderBySql,
        safePageSize,
        offset,
      }),
    );

    if (rows.length === 0 && safePage > 1) {
      const countRows = await this.prisma.$queryRaw<ContractListCountRow[]>(
        buildConsumerContractsRecountSql({
          consumerId,
          participantPaymentIdsSql,
          searchSql,
          matchedPaymentsSql,
          statusFilterSql,
          documentsFilterSql,
          paymentsFilterSql,
        }),
      );

      return buildEmptyContractListPageResult(countRows, safePage, safePageSize);
    }

    return buildContractListPageResult(rows, safePage, safePageSize);
  }

  async findContactsForList(consumerId: string, term: string) {
    return this.prisma.contactModel.findMany({
      where: {
        consumerId,
        deletedAt: null,
        ...(term
          ? {
              OR: [
                { email: { contains: term, mode: `insensitive` as const } },
                { name: { contains: term, mode: `insensitive` as const } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: `desc` },
    });
  }

  async findPaymentRequestsForContracts(consumerId: string, emails: string[], consumerEmail: string | null) {
    return this.prisma.paymentRequestModel.findMany({
      where: buildConsumerContractPaymentsWhere(consumerId, emails, consumerEmail),
      include: {
        payer: true,
        requester: true,
        ledgerEntries: {
          where: { consumerId },
          orderBy: { createdAt: `desc` },
          take: 1,
          include: {
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        },
        attachments: {
          where: {
            deletedAt: null,
            resource: {
              deletedAt: null,
            },
          },
        },
      },
    });
  }

  async findContactForDetails(id: string, consumerId: string) {
    return this.prisma.contactModel.findFirst({
      where: {
        id,
        consumerId,
        deletedAt: null,
      },
    });
  }

  async findPaymentRequestsForDetails(consumerId: string, contractEmail: string, consumerEmail: string | null) {
    return this.prisma.paymentRequestModel.findMany({
      where: buildConsumerContractPaymentsWhere(consumerId, [contractEmail], consumerEmail),
      include: {
        ledgerEntries: {
          where: { consumerId },
          orderBy: { createdAt: `desc` },
          take: 1,
          include: {
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        },
        attachments: {
          where: {
            deletedAt: null,
            resource: {
              deletedAt: null,
            },
          },
          include: {
            resource: {
              include: {
                resourceTags: {
                  include: {
                    tag: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ updatedAt: `desc` }, { createdAt: `desc` }],
    });
  }
}
