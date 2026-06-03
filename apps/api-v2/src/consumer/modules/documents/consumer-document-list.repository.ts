import { Injectable, NotFoundException } from '@nestjs/common';

import { errorCodes } from '@remoola/shared-constants';

import {
  type ConsumerDocumentListItem,
  type ConsumerDocumentListRow,
  formatConsumerDocumentListRows,
} from './consumer-document-list.mapper';
import {
  buildContractScopedConsumerDocumentListCountSql,
  buildContractScopedConsumerDocumentListRowsSql,
  buildGeneralConsumerDocumentListCountSql,
  buildGeneralConsumerDocumentListRowsSql,
} from './consumer-document-list.sql';
import { PrismaService } from '../../../shared/prisma.service';

type DocumentListResult = {
  items: ConsumerDocumentListItem[];
  total: number;
  page: number;
  pageSize: number;
};

@Injectable()
export class ConsumerDocumentListRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async getConsumerEmail(consumerId: string): Promise<string | null> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });

    return consumer?.email?.trim().toLowerCase() ?? null;
  }

  private async getDocumentsRaw(params: {
    consumerId: string;
    consumerEmail: string | null;
    safePage: number;
    safePageSize: number;
    kindFilter: string | null;
    backendBaseUrl?: string;
    contractEmail?: string;
  }): Promise<DocumentListResult> {
    const { consumerId, consumerEmail, safePage, safePageSize, kindFilter, backendBaseUrl, contractEmail } = params;

    if (contractEmail) {
      if (kindFilter && kindFilter !== `PAYMENT`) {
        return { items: [], total: 0, page: safePage, pageSize: safePageSize };
      }

      const rows = await this.prisma.$queryRaw<ConsumerDocumentListRow[]>(
        buildContractScopedConsumerDocumentListRowsSql({
          consumerId,
          consumerEmail,
          safePage,
          safePageSize,
          kindFilter,
          contractEmail,
        }),
      );

      if (rows.length === 0 && safePage > 1) {
        const countRows = await this.prisma.$queryRaw<Array<{ totalCount: number | bigint }>>(
          buildContractScopedConsumerDocumentListCountSql({
            consumerId,
            consumerEmail,
            safePage,
            safePageSize,
            kindFilter,
            contractEmail,
          }),
        );

        return {
          items: [],
          total: countRows.length > 0 ? Number(countRows[0].totalCount) : 0,
          page: safePage,
          pageSize: safePageSize,
        };
      }

      const formatted = formatConsumerDocumentListRows(rows, backendBaseUrl);
      return { ...formatted, page: safePage, pageSize: safePageSize };
    }

    const rows = await this.prisma.$queryRaw<ConsumerDocumentListRow[]>(
      buildGeneralConsumerDocumentListRowsSql({
        consumerId,
        consumerEmail,
        safePage,
        safePageSize,
        kindFilter,
      }),
    );

    if (rows.length === 0 && safePage > 1) {
      const countRows = await this.prisma.$queryRaw<Array<{ totalCount: number | bigint }>>(
        buildGeneralConsumerDocumentListCountSql({
          consumerId,
          consumerEmail,
          safePage,
          safePageSize,
          kindFilter,
        }),
      );

      return {
        items: [],
        total: countRows.length > 0 ? Number(countRows[0].totalCount) : 0,
        page: safePage,
        pageSize: safePageSize,
      };
    }

    const formatted = formatConsumerDocumentListRows(rows, backendBaseUrl);
    return { ...formatted, page: safePage, pageSize: safePageSize };
  }

  async list(params: {
    consumerId: string;
    kind?: string;
    page?: number;
    pageSize?: number;
    backendBaseUrl?: string;
    contactId?: string;
  }): Promise<DocumentListResult> {
    const { consumerId, kind, page = 1, pageSize = 10, backendBaseUrl, contactId } = params;
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safePageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize)) || 10));
    const kindFilter = kind?.trim().toUpperCase() || null;
    const normalizedContactId = contactId?.trim();
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const contractContact = normalizedContactId
      ? await this.prisma.contactModel.findFirst({
          where: {
            id: normalizedContactId,
            consumerId,
            deletedAt: null,
          },
          select: {
            id: true,
            email: true,
          },
        })
      : null;

    if (normalizedContactId && !contractContact) {
      throw new NotFoundException(errorCodes.CONTACT_NOT_FOUND);
    }

    return this.getDocumentsRaw({
      consumerId,
      consumerEmail,
      safePage,
      safePageSize,
      kindFilter,
      backendBaseUrl,
      contractEmail: contractContact?.email,
    });
  }
}
