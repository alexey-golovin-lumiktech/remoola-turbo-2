import { Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';
import { decodeAdminV2Cursor, encodeAdminV2Cursor } from '../admin-v2-cursor';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const SEARCH_MAX_LENGTH = 200;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT,
  $Enums.LedgerEntryType.USER_DEPOSIT,
] as const;

function normalizeLimit(limit?: number): number {
  return Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));
}

function normalizeSearch(q?: string): string | undefined {
  const search = q?.trim();
  return search ? search.slice(0, SEARCH_MAX_LENGTH) : undefined;
}

function asNumber(value?: number): number | undefined {
  return Number.isFinite(value) ? Number(value) : undefined;
}

function normalizeEnumValue<T extends string>(value: string | undefined, values: readonly T[]): T | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return values.includes(value.trim() as T) ? (value.trim() as T) : undefined;
}

function buildCreatedAtCursorWhere(
  cursor: { createdAt: Date; id: string } | null,
): Prisma.PaymentRequestModelWhereInput {
  if (!cursor) {
    return {};
  }

  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      {
        AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }],
      },
    ],
  };
}

function buildDateRangeFilter(dateFrom?: Date, dateTo?: Date): Prisma.DateTimeNullableFilter | undefined {
  if (dateFrom && dateTo) {
    return { gte: dateFrom, lte: dateTo };
  }

  if (dateFrom) {
    return { gte: dateFrom };
  }

  if (dateTo) {
    return { lte: dateTo };
  }

  return undefined;
}

@Injectable()
export class AdminV2PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private getEffectiveLedgerStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private getLatestSettlementEntry(
    paymentRequest:
      | {
          ledgerEntries?: Array<{
            status: $Enums.TransactionStatus;
            createdAt: Date;
            type: $Enums.LedgerEntryType;
            outcomes?: Array<{ status: $Enums.TransactionStatus }>;
          }>;
        }
      | null
      | undefined,
  ) {
    return [...(paymentRequest?.ledgerEntries ?? [])]
      .filter((entry) =>
        PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES.includes(
          entry.type as (typeof PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES)[number],
        ),
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  }

  private getEffectivePaymentStatus(
    paymentRequest:
      | {
          status: $Enums.TransactionStatus;
          ledgerEntries?: Array<{
            status: $Enums.TransactionStatus;
            createdAt: Date;
            type: $Enums.LedgerEntryType;
            outcomes?: Array<{ status: $Enums.TransactionStatus }>;
          }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus | null {
    if (!paymentRequest) {
      return null;
    }

    const latestEntry = this.getLatestSettlementEntry(paymentRequest);
    return latestEntry ? this.getEffectiveLedgerStatus(latestEntry) : paymentRequest.status;
  }

  private derivePaymentRail(
    paymentRequest:
      | {
          paymentRail?: $Enums.PaymentRail | null;
          ledgerEntries?: Array<{
            type: $Enums.LedgerEntryType;
            metadata?: Prisma.JsonValue | null;
          }>;
        }
      | null
      | undefined,
  ): $Enums.PaymentRail | null {
    if (!paymentRequest) {
      return null;
    }

    if (paymentRequest.paymentRail) {
      return paymentRequest.paymentRail;
    }

    for (const entry of paymentRequest.ledgerEntries ?? []) {
      const metadata = JSON.parse(JSON.stringify(entry.metadata ?? {})) as { rail?: $Enums.PaymentRail | null };
      if (metadata.rail) {
        return metadata.rail;
      }
    }

    return null;
  }

  async listPaymentRequests(params?: {
    cursor?: string;
    limit?: number;
    q?: string;
    status?: string;
    paymentRail?: string;
    currencyCode?: string;
    amountMin?: number;
    amountMax?: number;
    dueDateFrom?: Date;
    dueDateTo?: Date;
    createdFrom?: Date;
    createdTo?: Date;
    overdue?: boolean;
  }) {
    const limit = normalizeLimit(params?.limit);
    const cursor = decodeAdminV2Cursor(params?.cursor);
    const search = normalizeSearch(params?.q);
    const status = normalizeEnumValue(
      params?.status,
      Object.values($Enums.TransactionStatus) as $Enums.TransactionStatus[],
    );
    const paymentRail = normalizeEnumValue(
      params?.paymentRail,
      Object.values($Enums.PaymentRail) as $Enums.PaymentRail[],
    );
    const currencyCode = normalizeEnumValue(
      params?.currencyCode,
      Object.values($Enums.CurrencyCode) as $Enums.CurrencyCode[],
    );
    const amountMin = asNumber(params?.amountMin);
    const amountMax = asNumber(params?.amountMax);
    const dueDateRange = buildDateRangeFilter(params?.dueDateFrom, params?.dueDateTo);
    const createdAtRange = buildDateRangeFilter(params?.createdFrom, params?.createdTo);
    const now = new Date();

    const where: Prisma.PaymentRequestModelWhereInput = {
      deletedAt: null,
      ...buildCreatedAtCursorWhere(cursor),
      ...(status ? { status } : {}),
      ...(paymentRail ? { paymentRail } : {}),
      ...(currencyCode ? { currencyCode } : {}),
      ...(amountMin != null || amountMax != null
        ? {
            amount: {
              ...(amountMin != null ? { gte: amountMin } : {}),
              ...(amountMax != null ? { lte: amountMax } : {}),
            },
          }
        : {}),
      ...(dueDateRange ? { dueDate: dueDateRange } : {}),
      ...(createdAtRange ? { createdAt: createdAtRange } : {}),
      ...(params?.overdue === true
        ? {
            dueDate: {
              ...(dueDateRange ?? {}),
              lt: now,
            },
            status: {
              in: [
                $Enums.TransactionStatus.WAITING,
                $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
                $Enums.TransactionStatus.PENDING,
              ],
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { id: UUID_REGEX.test(search) ? search : undefined },
              { description: { contains: search, mode: `insensitive` } },
              { payerEmail: { contains: search, mode: `insensitive` } },
              { requesterEmail: { contains: search, mode: `insensitive` } },
              { payer: { email: { contains: search, mode: `insensitive` } } },
              { requester: { email: { contains: search, mode: `insensitive` } } },
            ].filter(Boolean) as Prisma.PaymentRequestModelWhereInput[],
          }
        : {}),
    };

    const rows = await this.prisma.paymentRequestModel.findMany({
      where,
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take: limit + 1,
      select: {
        id: true,
        amount: true,
        currencyCode: true,
        status: true,
        paymentRail: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        payer: { select: { id: true, email: true } },
        requester: { select: { id: true, email: true } },
        payerEmail: true,
        requesterEmail: true,
        attachments: {
          where: { deletedAt: null },
          select: { id: true },
        },
        ledgerEntries: {
          where: {
            deletedAt: null,
            type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
          },
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          take: 4,
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
            metadata: true,
            outcomes: {
              orderBy: [{ createdAt: `desc` }, { id: `desc` }],
              take: 1,
              select: { status: true },
            },
          },
        },
      },
    });

    const items = rows.slice(0, limit).map((row) => {
      const effectiveStatus = this.getEffectivePaymentStatus(row) ?? row.status;
      const rail = this.derivePaymentRail(row);

      return {
        id: row.id,
        amount: row.amount.toString(),
        currencyCode: row.currencyCode,
        persistedStatus: row.status,
        effectiveStatus,
        staleWarning: effectiveStatus !== row.status,
        paymentRail: rail,
        payer: {
          id: row.payer?.id ?? null,
          email: row.payer?.email ?? row.payerEmail ?? null,
        },
        requester: {
          id: row.requester?.id ?? null,
          email: row.requester?.email ?? row.requesterEmail ?? null,
        },
        dueDate: row.dueDate,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        attachmentsCount: row.attachments.length,
        dataFreshnessClass: `bounded-snapshot`,
      };
    });

    const next = rows[limit];
    return {
      items,
      pageInfo: {
        nextCursor: next ? encodeAdminV2Cursor({ createdAt: next.createdAt, id: next.id }) : null,
        limit,
      },
    };
  }

  async getPaymentRequestCase(paymentRequestId: string) {
    const paymentRequest = await this.prisma.paymentRequestModel.findUnique({
      where: { id: paymentRequestId },
      select: {
        id: true,
        amount: true,
        currencyCode: true,
        status: true,
        paymentRail: true,
        description: true,
        dueDate: true,
        sentDate: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        payer: { select: { id: true, email: true } },
        requester: { select: { id: true, email: true } },
        payerEmail: true,
        requesterEmail: true,
        attachments: {
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          select: {
            id: true,
            createdAt: true,
            deletedAt: true,
            resource: {
              select: {
                id: true,
                originalName: true,
                size: true,
                mimetype: true,
                downloadUrl: true,
                createdAt: true,
                deletedAt: true,
              },
            },
          },
        },
        ledgerEntries: {
          orderBy: [{ createdAt: `asc` }, { id: `asc` }],
          select: {
            id: true,
            ledgerId: true,
            type: true,
            amount: true,
            currencyCode: true,
            status: true,
            createdAt: true,
            deletedAt: true,
            metadata: true,
            outcomes: {
              orderBy: [{ createdAt: `desc` }, { id: `desc` }],
              select: {
                id: true,
                status: true,
                source: true,
                externalId: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!paymentRequest) {
      throw new NotFoundException(`Payment request not found`);
    }

    const effectiveStatus = this.getEffectivePaymentStatus(paymentRequest) ?? paymentRequest.status;
    const timeline = [
      {
        event: `payment_request_created`,
        timestamp: paymentRequest.createdAt,
        metadata: {
          persistedStatus: paymentRequest.status,
          amount: paymentRequest.amount.toString(),
          currencyCode: paymentRequest.currencyCode,
        },
      },
      ...(paymentRequest.sentDate
        ? [
            {
              event: `payment_request_sent`,
              timestamp: paymentRequest.sentDate,
              metadata: null,
            },
          ]
        : []),
      ...(paymentRequest.dueDate
        ? [
            {
              event: `payment_request_due`,
              timestamp: paymentRequest.dueDate,
              metadata: null,
            },
          ]
        : []),
      ...paymentRequest.attachments.map((attachment) => ({
        event: `attachment_added`,
        timestamp: attachment.createdAt,
        metadata: {
          attachmentId: attachment.id,
          resourceId: attachment.resource.id,
          name: attachment.resource.originalName,
          deletedAt: attachment.deletedAt,
          resourceDeletedAt: attachment.resource.deletedAt,
        },
      })),
      ...paymentRequest.ledgerEntries.flatMap((entry) => [
        {
          event: `ledger_entry_created`,
          timestamp: entry.createdAt,
          metadata: {
            ledgerEntryId: entry.id,
            ledgerId: entry.ledgerId,
            type: entry.type,
            amount: entry.amount.toString(),
            currencyCode: entry.currencyCode,
            deletedAt: entry.deletedAt,
          },
        },
        ...entry.outcomes.map((outcome) => ({
          event: `ledger_outcome_recorded`,
          timestamp: outcome.createdAt,
          metadata: {
            ledgerEntryId: entry.id,
            outcomeId: outcome.id,
            status: outcome.status,
            source: outcome.source,
            externalId: outcome.externalId,
          },
        })),
      ]),
    ].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());

    const auditContext = await this.prisma.adminActionAuditLogModel.findMany({
      where: {
        resourceId: paymentRequest.id,
      },
      include: {
        admin: {
          select: {
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take: 20,
    });

    return {
      id: paymentRequest.id,
      core: {
        id: paymentRequest.id,
        amount: paymentRequest.amount.toString(),
        currencyCode: paymentRequest.currencyCode,
        persistedStatus: paymentRequest.status,
        effectiveStatus,
        paymentRail: this.derivePaymentRail(paymentRequest),
        description: paymentRequest.description,
        dueDate: paymentRequest.dueDate,
        sentDate: paymentRequest.sentDate,
        createdAt: paymentRequest.createdAt,
        deletedAt: paymentRequest.deletedAt,
      },
      payer: {
        id: paymentRequest.payer?.id ?? null,
        email: paymentRequest.payer?.email ?? paymentRequest.payerEmail ?? null,
      },
      requester: {
        id: paymentRequest.requester?.id ?? null,
        email: paymentRequest.requester?.email ?? paymentRequest.requesterEmail ?? null,
      },
      attachments: paymentRequest.attachments.map((attachment) => ({
        id: attachment.id,
        resourceId: attachment.resource.id,
        name: attachment.resource.originalName,
        size: attachment.resource.size,
        mimetype: attachment.resource.mimetype,
        downloadUrl: attachment.resource.downloadUrl,
        createdAt: attachment.resource.createdAt,
        deletedAt: attachment.deletedAt,
        resourceDeletedAt: attachment.resource.deletedAt,
      })),
      ledgerEntries: paymentRequest.ledgerEntries.map((entry) => ({
        id: entry.id,
        ledgerId: entry.ledgerId,
        type: entry.type,
        amount: entry.amount.toString(),
        currencyCode: entry.currencyCode,
        effectiveStatus: this.getEffectiveLedgerStatus(entry),
        createdAt: entry.createdAt,
        deletedAt: entry.deletedAt,
      })),
      timeline,
      auditContext: auditContext.map((row) => ({
        id: row.id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resourceId,
        adminEmail: row.admin?.email ?? null,
        createdAt: row.createdAt,
      })),
      version: paymentRequest.updatedAt.getTime(),
      updatedAt: paymentRequest.updatedAt,
      staleWarning: effectiveStatus !== paymentRequest.status,
      dataFreshnessClass: `exact`,
    };
  }
}
