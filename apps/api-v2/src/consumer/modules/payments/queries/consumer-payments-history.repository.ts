import { Injectable } from '@nestjs/common';

import { PAYMENT_DIRECTION } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';

import {
  buildConsumerStatusFilter,
  normalizeConsumerFacingTransactionStatus,
} from '../../../../shared/consumer-status-compat';
import { parseLedgerMetadata } from '../../../../shared/json-metadata.utils';
import { sqlUuid } from '../../../../shared/prisma-raw.utils';
import { PrismaService } from '../../../../shared/prisma.service';
import { getEffectiveLedgerStatusOrNull } from '../../../../shared/transaction-status.utils';
import { type PaymentsHistoryQuery } from '../dto';

type HistoryRawRow = {
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
};

function normalizeProductLedgerType(
  type: $Enums.LedgerEntryType,
  paymentRequestId: string | null | undefined,
): $Enums.LedgerEntryType {
  if (!paymentRequestId) return type;
  if (type === $Enums.LedgerEntryType.USER_DEPOSIT) return $Enums.LedgerEntryType.USER_PAYMENT;
  if (type === $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL) return $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL;
  return type;
}

function mapHistoryEntry(row: HistoryRawRow) {
  const amount = Number(row.amount);
  const metadata = parseLedgerMetadata(row.metadata);
  const effectiveStatus = getEffectiveLedgerStatusOrNull({
    status: row.effectiveStatus,
    outcomes: [],
  })!;

  return {
    id: row.id,
    ledgerId: row.ledgerId,
    type: normalizeProductLedgerType(row.type, row.paymentRequestId),
    status: normalizeConsumerFacingTransactionStatus(effectiveStatus),
    currencyCode: row.currencyCode,
    amount,
    direction: amount > 0 ? PAYMENT_DIRECTION.INCOME : PAYMENT_DIRECTION.OUTCOME,
    createdAt: new Date(row.createdAt).toISOString(),
    rail: metadata.rail ?? row.paymentRail ?? null,
    paymentMethodId: metadata.paymentMethodId,
    paymentRequestId: row.paymentRequestId ?? null,
  };
}

@Injectable()
export class ConsumerPaymentsHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getHistory(consumerId: string, query: PaymentsHistoryQuery) {
    const { direction, status, type, limit = 20, offset = 0 } = query;

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

    const rows = !effectiveStatusFilter
      ? await this.prisma.$queryRaw<Array<HistoryRawRow>>(Prisma.sql`
            WITH latest_entry_ids AS (
              SELECT DISTINCT ON (le.ledger_id)
                le.id
              FROM ledger_entry le
              WHERE le.consumer_id = ${sqlUuid(consumerId)}
                AND le.deleted_at IS NULL
              ORDER BY le.ledger_id, le.created_at DESC, le.id DESC
            ),
            latest_entries AS (
              SELECT
                le.id,
                le.ledger_id AS "ledgerId",
                le.type,
                CASE
                  WHEN le.payment_request_id IS NOT NULL AND le.type::text = ${$Enums.LedgerEntryType.USER_DEPOSIT}
                    THEN ${$Enums.LedgerEntryType.USER_PAYMENT}::text
                  WHEN le.payment_request_id IS NOT NULL
                    AND le.type::text = ${$Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL}
                    THEN ${$Enums.LedgerEntryType.USER_PAYMENT_REVERSAL}::text
                  ELSE le.type::text
                END AS "normalizedType",
                le.status::text AS "baseStatus",
                le.amount,
                le.currency_code AS "currencyCode",
                le.created_at AS "createdAt",
                le.metadata,
                le.payment_request_id AS "paymentRequestId",
                pr.payment_rail AS "paymentRail"
              FROM latest_entry_ids latest_ids
              JOIN ledger_entry le ON le.id = latest_ids.id
              LEFT JOIN payment_request pr ON pr.id = le.payment_request_id
            ),
            filtered AS (
              SELECT *
              FROM latest_entries latest
              WHERE 1 = 1
                ${directionSql}
                ${typeSql}
            ),
            paged AS (
              SELECT
                latest.*,
                COUNT(*) OVER()::int AS "totalRows"
              FROM filtered latest
              ORDER BY latest."createdAt" DESC, latest.id DESC
              OFFSET ${offset}
              LIMIT ${limit}
            )
            SELECT
              latest.id,
              latest."ledgerId",
              latest.type,
              COALESCE(latest_outcome.status::text, latest."baseStatus") AS "effectiveStatus",
              latest.amount,
              latest."currencyCode",
              latest."createdAt",
              latest.metadata,
              latest."paymentRequestId",
              latest."paymentRail",
              latest."totalRows"
            FROM paged latest
            LEFT JOIN LATERAL (
              SELECT leo.status
              FROM ledger_entry_outcome leo
              WHERE leo.ledger_entry_id = latest.id
              ORDER BY leo.created_at DESC, leo.id DESC
              LIMIT 1
            ) latest_outcome ON true
            ORDER BY latest."createdAt" DESC, latest.id DESC
          `)
      : await this.prisma.$queryRaw<Array<HistoryRawRow>>(Prisma.sql`
        WITH latest_entry_ids AS (
          SELECT DISTINCT ON (le.ledger_id)
            le.id
          FROM ledger_entry le
          WHERE le.consumer_id = ${sqlUuid(consumerId)}
            AND le.deleted_at IS NULL
          ORDER BY le.ledger_id, le.created_at DESC, le.id DESC
        ),
        latest_entries AS (
          SELECT
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
          FROM latest_entry_ids latest_ids
          JOIN ledger_entry le ON le.id = latest_ids.id
          LEFT JOIN payment_request pr ON pr.id = le.payment_request_id
          LEFT JOIN LATERAL (
            SELECT leo.status
            FROM ledger_entry_outcome leo
            WHERE leo.ledger_entry_id = le.id
            ORDER BY leo.created_at DESC, leo.id DESC
            LIMIT 1
          ) latest_outcome ON true
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

    const items = rows.map(mapHistoryEntry);
    const total = Number(rows[0]?.totalRows ?? 0);
    const labelByPaymentMethodId = await this.fetchPaymentMethodLabels(consumerId, items);

    return {
      items: items.map((item) => ({
        ...item,
        paymentMethodLabel: item.paymentMethodId ? (labelByPaymentMethodId.get(item.paymentMethodId) ?? null) : null,
      })),
      total,
      limit,
      offset,
    };
  }

  private async fetchPaymentMethodLabels(
    consumerId: string,
    items: Array<{ paymentMethodId?: string | null }>,
  ): Promise<Map<string, string>> {
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
    const labelById = new Map<string, string>();

    if (paymentMethodIds.length === 0) return labelById;

    const paymentMethods = await this.prisma.paymentMethodModel.findMany({
      where: { id: { in: paymentMethodIds }, consumerId },
      select: { id: true, brand: true, last4: true },
    });

    for (const paymentMethod of paymentMethods) {
      const brand = paymentMethod.brand || `Bank account`;
      const last4 = paymentMethod.last4 ? ` •••• ${paymentMethod.last4}` : ``;
      labelById.set(paymentMethod.id, `${brand}${last4}`);
    }

    return labelById;
  }
}
