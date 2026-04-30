import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PAYMENT_DIRECTION } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { type PaymentsHistoryQuery } from './dto';
import { BalanceCalculationMode, BalanceCalculationService } from '../../../shared/balance-calculation.service';
import { buildPaymentRequestParticipantIdsSql, sqlUuid } from '../../../shared/prisma-raw.utils';
import { PrismaService } from '../../../shared/prisma.service';
import { normalizeConsumerFacingTransactionStatus, buildConsumerStatusFilter } from '../../consumer-status-compat';
import { buildConsumerDocumentDownloadUrl } from '../documents/document-download-url';

@Injectable()
export class ConsumerPaymentsQueriesService {
  private readonly logger = new Logger(ConsumerPaymentsQueriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly balanceService: BalanceCalculationService,
  ) {}

  private getEffectiveLedgerStatus(
    entry:
      | {
          status: $Enums.TransactionStatus;
          outcomes?: Array<{ status: $Enums.TransactionStatus }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus | null {
    if (!entry) return null;
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private getEffectivePaymentRequestStatus(
    paymentRequestStatus: $Enums.TransactionStatus,
    entry:
      | {
          status: $Enums.TransactionStatus;
          outcomes?: Array<{ status: $Enums.TransactionStatus }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus {
    return this.getEffectiveLedgerStatus(entry) ?? paymentRequestStatus;
  }

  private normalizeProductLedgerType(
    type: $Enums.LedgerEntryType,
    paymentRequestId: string | null | undefined,
  ): $Enums.LedgerEntryType {
    if (!paymentRequestId) return type;
    if (type === $Enums.LedgerEntryType.USER_DEPOSIT) return $Enums.LedgerEntryType.USER_PAYMENT;
    if (type === $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL) return $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL;
    return type;
  }

  private isInvoiceResource(resource: { resourceTags?: Array<{ tag: { name: string } }> } | null | undefined): boolean {
    return resource?.resourceTags?.some((resourceTag) => resourceTag.tag.name.startsWith(`INVOICE-`)) ?? false;
  }

  private async getConsumerEmail(consumerId: string): Promise<string | null> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });
    return consumer?.email?.trim().toLowerCase() ?? null;
  }

  private isEmailOnlyParticipant(
    participantId: string | null | undefined,
    participantEmail: string | null | undefined,
    consumerEmail: string | null,
  ): boolean {
    return (
      !participantId && !!participantEmail && !!consumerEmail && participantEmail.trim().toLowerCase() === consumerEmail
    );
  }

  private buildPaymentRoleConditions(
    consumerId: string,
    consumerEmail: string | null,
    role?: string,
  ): Prisma.PaymentRequestModelWhereInput[] {
    const payerConditions: Prisma.PaymentRequestModelWhereInput[] = [
      { payerId: consumerId },
      ...(consumerEmail
        ? [{ payerId: null, payerEmail: { equals: consumerEmail, mode: `insensitive` as const } }]
        : []),
    ];
    const requesterConditions: Prisma.PaymentRequestModelWhereInput[] = [
      { requesterId: consumerId },
      ...(consumerEmail
        ? [{ requesterId: null, requesterEmail: { equals: consumerEmail, mode: `insensitive` as const } }]
        : []),
    ];

    if (role === `PAYER`) return payerConditions;
    if (role === `REQUESTER`) return requesterConditions;
    return [...payerConditions, ...requesterConditions];
  }

  private buildPaymentRoleIdsSql(consumerId: string, consumerEmail: string | null, role?: string): Prisma.Sql {
    const normalizedRole = role === `PAYER` || role === `REQUESTER` ? role : undefined;
    return buildPaymentRequestParticipantIdsSql({
      consumerId,
      consumerEmail: consumerEmail?.trim().toLowerCase() ?? null,
      role: normalizedRole,
    });
  }

  private mapHistoryEntry(row: {
    id: string;
    ledgerId: string;
    type: $Enums.LedgerEntryType;
    status: $Enums.TransactionStatus;
    amount: Prisma.Decimal | number | string;
    currencyCode: $Enums.CurrencyCode;
    createdAt: Date;
    metadata: Prisma.JsonValue | null;
    paymentRequestId: string | null;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
    paymentRequest?: { paymentRail: $Enums.PaymentRail | null } | null;
  }) {
    const amount = Number(row.amount);
    const metadata = JSON.parse(JSON.stringify(row.metadata || {}));

    return {
      id: row.id,
      ledgerId: row.ledgerId,
      type: this.normalizeProductLedgerType(row.type, row.paymentRequestId),
      status: normalizeConsumerFacingTransactionStatus(this.getEffectiveLedgerStatus(row)!),
      currencyCode: row.currencyCode,
      amount,
      direction: amount > 0 ? PAYMENT_DIRECTION.INCOME : PAYMENT_DIRECTION.OUTCOME,
      createdAt: row.createdAt,
      rail: metadata.rail ?? row.paymentRequest?.paymentRail ?? null,
      paymentMethodId: metadata.paymentMethodId ?? null,
      paymentRequestId: row.paymentRequestId ?? null,
    };
  }

  async listPayments(params: {
    consumerId: string;
    page: number;
    pageSize: number;
    status?: string;
    type?: string;
    role?: string;
    search?: string;
  }) {
    const { consumerId, page, pageSize, status, type, role, search } = params;
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const normalizedConsumerEmail = consumerEmail?.trim().toLowerCase() ?? null;
    const effectiveStatusFilter = buildConsumerStatusFilter(status);
    const roleConditions = this.buildPaymentRoleConditions(consumerId, consumerEmail, role);

    const whereBase: Prisma.PaymentRequestModelWhereInput = search
      ? {
          AND: [
            {
              OR: roleConditions,
            },
            {
              OR: [
                { description: { contains: search, mode: `insensitive` } },
                { requester: { email: { contains: search, mode: `insensitive` } } },
                { requesterEmail: { contains: search, mode: `insensitive` } },
                { payer: { email: { contains: search, mode: `insensitive` } } },
                { payerEmail: { contains: search, mode: `insensitive` } },
              ],
            },
          ],
          ...(type && { type: type as $Enums.TransactionType }),
        }
      : {
          OR: roleConditions,
          ...(type && { type: type as $Enums.TransactionType }),
        };
    const include = {
      requester: true,
      payer: true,
      ledgerEntries: {
        where: { consumerId },
        orderBy: { createdAt: `desc` as const },
        take: 1,
        include: {
          outcomes: {
            orderBy: { createdAt: `desc` as const },
            take: 1,
            select: { status: true },
          },
        },
      },
    };
    const orderBy = {
      createdAt: `desc` as const,
    };
    type PaymentRequestWithInclude = Prisma.PaymentRequestModelGetPayload<{ include: typeof include }>;
    let total = 0;
    let paymentRequests: PaymentRequestWithInclude[] = [];

    if (effectiveStatusFilter && typeof this.prisma.$queryRaw === `function`) {
      const participantPaymentIdsSql = this.buildPaymentRoleIdsSql(consumerId, normalizedConsumerEmail, role);
      const searchTerm = search?.trim();
      const searchPattern = searchTerm ? `%${searchTerm}%` : null;
      const typeSql = type ? Prisma.sql`AND pr.type::text = ${type}` : Prisma.empty;
      const searchSql = searchPattern
        ? Prisma.sql`
            AND (
              LOWER(COALESCE(pr.description, '')) LIKE LOWER(${searchPattern})
              OR LOWER(COALESCE(requester.email, '')) LIKE LOWER(${searchPattern})
              OR LOWER(COALESCE(pr.requester_email, '')) LIKE LOWER(${searchPattern})
              OR LOWER(COALESCE(payer.email, '')) LIKE LOWER(${searchPattern})
              OR LOWER(COALESCE(pr.payer_email, '')) LIKE LOWER(${searchPattern})
            )
          `
        : Prisma.empty;
      const statusCoalesce = Prisma.sql`COALESCE(
        latest_outcome.status::text,
        latest_le.status::text,
        pr.status::text
      )`;
      const listPaymentsStatusSql =
        typeof effectiveStatusFilter === `object` && `in` in effectiveStatusFilter
          ? Prisma.sql`AND ${statusCoalesce} IN (${Prisma.join(effectiveStatusFilter.in)})`
          : Prisma.sql`AND ${statusCoalesce} = ${effectiveStatusFilter}`;
      const filteredPaymentIdsSql = Prisma.sql`
        WITH participant_payment_ids AS (
          ${participantPaymentIdsSql}
        )
        SELECT pr.id, pr.created_at
        FROM participant_payment_ids ppi
        JOIN payment_request pr ON pr.id = ppi.id
        LEFT JOIN consumer requester ON requester.id = pr.requester_id
        LEFT JOIN consumer payer ON payer.id = pr.payer_id
        LEFT JOIN LATERAL (
          SELECT le.id, le.status
          FROM ledger_entry le
          WHERE le.payment_request_id = pr.id
            AND le.consumer_id = ${sqlUuid(consumerId)}
            AND le.deleted_at IS NULL
          ORDER BY le.created_at DESC, le.id DESC
          LIMIT 1
        ) latest_le ON true
        LEFT JOIN LATERAL (
          SELECT leo.status
          FROM ledger_entry_outcome leo
          WHERE leo.ledger_entry_id = latest_le.id
          ORDER BY leo.created_at DESC, leo.id DESC
          LIMIT 1
        ) latest_outcome ON true
        WHERE 1 = 1
          ${typeSql}
          ${searchSql}
          ${listPaymentsStatusSql}
      `;
      const [totalRows, pageIdRows] = await Promise.all([
        this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
          WITH filtered AS (${filteredPaymentIdsSql})
          SELECT COUNT(*)::int AS total
          FROM filtered
        `),
        this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          WITH filtered AS (${filteredPaymentIdsSql})
          SELECT id
          FROM filtered
          ORDER BY created_at DESC, id DESC
          OFFSET ${(page - 1) * pageSize}
          LIMIT ${pageSize}
        `),
      ]);
      const pageIds = pageIdRows.map((row) => row.id);
      total = Number(totalRows[0]?.total ?? 0);
      paymentRequests =
        pageIds.length === 0
          ? []
          : await this.prisma.paymentRequestModel.findMany({
              where: { id: { in: pageIds } },
              include,
            });
      const positionById = new Map(pageIds.map((id, index) => [id, index]));
      paymentRequests.sort((left, right) => (positionById.get(left.id) ?? 0) - (positionById.get(right.id) ?? 0));
    } else {
      paymentRequests = effectiveStatusFilter
        ? await this.prisma.paymentRequestModel.findMany({
            where: whereBase,
            include,
            orderBy,
            take: 2000,
          })
        : await this.prisma.paymentRequestModel.findMany({
            where: whereBase,
            include,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
          });
      if (effectiveStatusFilter) {
        total = 0;
      } else {
        total = await this.prisma.paymentRequestModel.count({ where: whereBase });
      }
    }

    const mappedItems = paymentRequests.map((paymentRequest) => {
      const latestTx =
        paymentRequest.ledgerEntries.find((entry) => entry.consumerId === consumerId) ??
        paymentRequest.ledgerEntries[0];
      const latestTxStatus = this.getEffectiveLedgerStatus(latestTx);
      const effectivePaymentStatus = this.getEffectivePaymentRequestStatus(paymentRequest.status, latestTx);
      const paymentRole =
        paymentRequest.payerId === consumerId ||
        (!paymentRequest.payerId &&
          normalizedConsumerEmail !== null &&
          paymentRequest.payerEmail?.trim().toLowerCase() === normalizedConsumerEmail)
          ? `PAYER`
          : `REQUESTER`;

      const counterparty = paymentRole === `PAYER` ? paymentRequest.requester : paymentRequest.payer;
      const counterpartyEmail =
        paymentRole === `PAYER`
          ? (paymentRequest.requester?.email ?? paymentRequest.requesterEmail ?? ``)
          : (paymentRequest.payer?.email ?? paymentRequest.payerEmail ?? ``);

      const latestTransaction =
        latestTx && latestTxStatus
          ? {
              id: latestTx.id,
              status: normalizeConsumerFacingTransactionStatus(latestTxStatus),
              createdAt: latestTx.createdAt.toISOString(),
            }
          : undefined;

      return {
        id: paymentRequest.id,
        amount: Number(paymentRequest.amount),
        currencyCode: paymentRequest.currencyCode,
        status: normalizeConsumerFacingTransactionStatus(effectivePaymentStatus),
        role: paymentRole,
        type: paymentRequest.type,
        description: paymentRequest.description,
        createdAt: paymentRequest.createdAt.toISOString(),
        counterparty: {
          id: counterparty?.id ?? ``,
          email: counterpartyEmail,
        },
        latestTransaction,
      };
    });

    if (effectiveStatusFilter && typeof this.prisma.$queryRaw !== `function`) {
      const filterSet =
        typeof effectiveStatusFilter === `object` && `in` in effectiveStatusFilter
          ? new Set(effectiveStatusFilter.in)
          : new Set([effectiveStatusFilter as $Enums.TransactionStatus]);
      const filteredItems = mappedItems.filter((item) => filterSet.has(item.status));
      return {
        items: filteredItems.slice((page - 1) * pageSize, page * pageSize),
        total: filteredItems.length,
        page,
        pageSize,
      };
    }

    return {
      items: mappedItems,
      total,
      page,
      pageSize,
    };
  }

  async getPaymentView(consumerId: string, paymentRequestId: string, backendBaseUrl?: string) {
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const paymentRequest = await this.prisma.paymentRequestModel.findUnique({
      where: { id: paymentRequestId },
      include: {
        payer: { select: { id: true, email: true } },
        requester: { select: { id: true, email: true } },
        attachments: {
          orderBy: { createdAt: `desc` },
          include: {
            resource: {
              include: {
                resourceTags: {
                  include: { tag: true },
                },
              },
            },
          },
        },
        ledgerEntries: {
          orderBy: { createdAt: `asc` },
          include: {
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        },
      },
    });

    if (!paymentRequest) {
      throw new NotFoundException(errorCodes.PAYMENT_REQUEST_NOT_FOUND_GET);
    }

    const isEmailOnlyPayer = this.isEmailOnlyParticipant(
      paymentRequest.payerId,
      paymentRequest.payerEmail,
      consumerEmail,
    );
    const isEmailOnlyRequester = this.isEmailOnlyParticipant(
      paymentRequest.requesterId,
      paymentRequest.requesterEmail,
      consumerEmail,
    );

    if (
      paymentRequest.payerId !== consumerId &&
      paymentRequest.requesterId !== consumerId &&
      !isEmailOnlyPayer &&
      !isEmailOnlyRequester
    ) {
      throw new ForbiddenException(errorCodes.PAYMENT_ACCESS_DENIED_GET);
    }

    const isPayer = paymentRequest.payerId === consumerId || isEmailOnlyPayer;
    const consumerLedgerEntry =
      paymentRequest.ledgerEntries
        .filter((entry) => entry.consumerId === consumerId)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null;

    return {
      id: paymentRequest.id,
      amount: Number(paymentRequest.amount),
      currencyCode: paymentRequest.currencyCode,
      status: normalizeConsumerFacingTransactionStatus(
        this.getEffectivePaymentRequestStatus(paymentRequest.status, consumerLedgerEntry),
      ),
      description: paymentRequest.description,
      dueDate: paymentRequest.dueDate,
      sentDate: paymentRequest.sentDate,
      createdAt: paymentRequest.createdAt,
      updatedAt: paymentRequest.updatedAt,
      role: isPayer ? `PAYER` : `REQUESTER`,
      payer: paymentRequest.payer ?? { id: null, email: paymentRequest.payerEmail ?? null },
      requester: paymentRequest.requester ?? { id: null, email: paymentRequest.requesterEmail ?? null },
      ledgerEntries: paymentRequest.ledgerEntries
        .filter((entry) => entry.consumerId === consumerId)
        .map((entry) => {
          const metadata = JSON.parse(JSON.stringify(entry.metadata || {}));
          const amount = Number(entry.amount);

          return {
            id: entry.id,
            ledgerId: entry.ledgerId,
            currencyCode: entry.currencyCode,
            amount,
            direction: amount > 0 ? PAYMENT_DIRECTION.INCOME : PAYMENT_DIRECTION.OUTCOME,
            status: normalizeConsumerFacingTransactionStatus(this.getEffectiveLedgerStatus(entry)!),
            type: this.normalizeProductLedgerType(entry.type, entry.paymentRequestId),
            createdAt: entry.createdAt,
            rail: metadata.rail ?? paymentRequest.paymentRail ?? null,
            counterpartyId: metadata.counterpartyId ?? null,
          };
        })
        .filter(
          (entry, index, self) =>
            index ===
            self.findIndex((candidate) => candidate.ledgerId === entry.ledgerId && candidate.type === entry.type),
        ),
      attachments: paymentRequest.attachments
        .filter((attachment) => !this.isInvoiceResource(attachment.resource) || attachment.requesterId === consumerId)
        .map((attachment) => ({
          id: attachment.resource.id,
          name: attachment.resource.originalName,
          downloadUrl: buildConsumerDocumentDownloadUrl(attachment.resource.id, backendBaseUrl),
          size: attachment.resource.size,
          createdAt: attachment.resource.createdAt,
        })),
    };
  }

  async getBalancesCompleted(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    try {
      const result = await this.balanceService.calculateMultiCurrency(consumerId, {
        mode: BalanceCalculationMode.COMPLETED,
      });
      return result.balances;
    } catch {
      this.logger.error(`Balance calculation failed`, { consumerId });
      throw new InternalServerErrorException(`An unexpected error occurred`);
    }
  }

  async getBalancesIncludePending(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    try {
      const result = await this.balanceService.calculateMultiCurrency(consumerId, {
        mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
      });
      return result.balances;
    } catch {
      this.logger.error(`Balance calculation failed`, { consumerId });
      throw new InternalServerErrorException(`An unexpected error occurred`);
    }
  }

  async getAvailableBalance(consumerId: string): Promise<number> {
    const result = await this.balanceService.calculateSingle(consumerId);
    return result.balance;
  }

  async getHistory(consumerId: string, query: PaymentsHistoryQuery) {
    const { direction, status, type, limit = 20, offset = 0 } = query;
    let items: ReturnType<ConsumerPaymentsQueriesService[`mapHistoryEntry`]>[];
    let total: number;

    if (typeof this.prisma.$queryRaw === `function`) {
      const effectiveStatusFilter = buildConsumerStatusFilter(status);
      const directionSql =
        direction === PAYMENT_DIRECTION.INCOME
          ? Prisma.sql`AND latest.amount > 0`
          : direction === PAYMENT_DIRECTION.OUTCOME
            ? Prisma.sql`AND latest.amount < 0`
            : Prisma.empty;
      const statusSql = !effectiveStatusFilter
        ? Prisma.empty
        : typeof effectiveStatusFilter === `object` && `in` in effectiveStatusFilter
          ? Prisma.sql`AND latest."effectiveStatus" IN (${Prisma.join(effectiveStatusFilter.in)})`
          : Prisma.sql`AND latest."effectiveStatus" = ${effectiveStatusFilter}`;
      const typeSql = type ? Prisma.sql`AND latest."normalizedType" = ${type}` : Prisma.empty;
      const rows = await this.prisma.$queryRaw<
        Array<{
          id: string;
          ledgerId: string;
          type: $Enums.LedgerEntryType;
          effectiveStatus: $Enums.TransactionStatus;
          amount: Prisma.Decimal | number | string;
          currencyCode: $Enums.CurrencyCode;
          createdAt: Date;
          metadata: Prisma.JsonValue | null;
          paymentRequestId: string | null;
          paymentRail: $Enums.PaymentRail | null;
          totalRows: number;
        }>
      >(Prisma.sql`
        WITH latest_entries AS (
          SELECT DISTINCT ON (le.ledger_id)
            le.id,
            le.ledger_id AS "ledgerId",
            le.type,
            CASE
              WHEN le.payment_request_id IS NOT NULL AND le.type::text = ${$Enums.LedgerEntryType.USER_DEPOSIT}
                THEN ${$Enums.LedgerEntryType.USER_PAYMENT}::text
              WHEN le.payment_request_id IS NOT NULL AND le.type::text = ${$Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL}
                THEN ${$Enums.LedgerEntryType.USER_PAYMENT_REVERSAL}::text
              ELSE le.type::text
            END AS "normalizedType",
            COALESCE(latest_outcome.status::text, le.status::text) AS "effectiveStatus",
            le.amount,
            le.currency_code AS "currencyCode",
            le.created_at AS "createdAt",
            le.metadata,
            le.payment_request_id AS "paymentRequestId",
            pr.payment_rail AS "paymentRail"
          FROM ledger_entry le
          LEFT JOIN payment_request pr ON pr.id = le.payment_request_id
          LEFT JOIN LATERAL (
            SELECT leo.status
            FROM ledger_entry_outcome leo
            WHERE leo.ledger_entry_id = le.id
            ORDER BY leo.created_at DESC, leo.id DESC
            LIMIT 1
          ) latest_outcome ON true
          WHERE le.consumer_id = ${sqlUuid(consumerId)}
            AND le.deleted_at IS NULL
          ORDER BY le.ledger_id, le.created_at DESC, le.id DESC
        ),
        filtered AS (
          SELECT *
          FROM latest_entries latest
          WHERE 1 = 1
            ${directionSql}
            ${statusSql}
            ${typeSql}
        )
        SELECT
          latest.id,
          latest."ledgerId",
          latest.type,
          latest."effectiveStatus",
          latest.amount,
          latest."currencyCode",
          latest."createdAt",
          latest.metadata,
          latest."paymentRequestId",
          latest."paymentRail",
          COUNT(*) OVER()::int AS "totalRows"
        FROM filtered latest
        ORDER BY latest."createdAt" DESC, latest.id DESC
        OFFSET ${offset}
        LIMIT ${limit}
      `);
      items = rows.map((row) =>
        this.mapHistoryEntry({
          id: row.id,
          ledgerId: row.ledgerId,
          type: row.type,
          status: row.effectiveStatus,
          amount: row.amount,
          currencyCode: row.currencyCode,
          createdAt: new Date(row.createdAt),
          metadata: row.metadata,
          paymentRequestId: row.paymentRequestId,
          outcomes: [],
          paymentRequest: { paymentRail: row.paymentRail },
        }),
      );
      total = Number(rows[0]?.totalRows ?? 0);
    } else {
      const where: Prisma.LedgerEntryModelWhereInput = { consumerId, deletedAt: null };
      const batchSize = Math.max(offset + limit + 50, 200);
      const latestEntryByLedgerId = new Map<string, ReturnType<ConsumerPaymentsQueriesService[`mapHistoryEntry`]>>();

      for (let skip = 0; ; skip += batchSize) {
        const rows = await this.prisma.ledgerEntryModel.findMany({
          where,
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          skip,
          take: batchSize,
          include: {
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
            paymentRequest: {
              select: { paymentRail: true },
            },
          },
        });

        for (const row of rows) {
          if (!latestEntryByLedgerId.has(row.ledgerId)) {
            latestEntryByLedgerId.set(row.ledgerId, this.mapHistoryEntry(row));
          }
        }

        if (rows.length < batchSize) {
          break;
        }
      }

      const filteredItems = Array.from(latestEntryByLedgerId.values())
        .filter((entry) => !direction || entry.direction === direction)
        .filter((entry) => !status || entry.status === status)
        .filter((entry) => !type || entry.type === type)
        .sort((left, right) => {
          const createdAtDiff = right.createdAt.getTime() - left.createdAt.getTime();
          if (createdAtDiff !== 0) return createdAtDiff;
          return right.id.localeCompare(left.id);
        });

      items = filteredItems.slice(offset, offset + limit);
      total = filteredItems.length;
    }

    const paymentMethodIds = Array.from(
      new Set(
        items
          .map((item) => item.paymentMethodId)
          .filter(
            (paymentMethodId): paymentMethodId is string =>
              typeof paymentMethodId === `string` && paymentMethodId.length > 0,
          ),
      ),
    );
    const paymentMethodLabelById = new Map<string, string>();

    if (paymentMethodIds.length > 0) {
      const paymentMethods = await this.prisma.paymentMethodModel.findMany({
        where: {
          id: { in: paymentMethodIds },
          consumerId,
        },
        select: {
          id: true,
          brand: true,
          last4: true,
        },
      });

      for (const paymentMethod of paymentMethods) {
        const brand = paymentMethod.brand || `Bank account`;
        const last4 = paymentMethod.last4 ? ` •••• ${paymentMethod.last4}` : ``;
        paymentMethodLabelById.set(paymentMethod.id, `${brand}${last4}`);
      }
    }

    return {
      items: items.map((item) => ({
        ...item,
        paymentMethodLabel: item.paymentMethodId ? (paymentMethodLabelById.get(item.paymentMethodId) ?? null) : null,
      })),
      total,
      limit,
      offset,
    };
  }
}
