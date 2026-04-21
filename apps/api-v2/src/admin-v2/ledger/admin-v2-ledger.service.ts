import { Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';
import { decodeAdminV2Cursor, encodeAdminV2Cursor } from '../admin-v2-cursor';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const SEARCH_MAX_LENGTH = 200;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeLimit(limit?: number): number {
  return Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));
}

function normalizeSearch(q?: string): string | undefined {
  const search = q?.trim();
  return search ? search.slice(0, SEARCH_MAX_LENGTH) : undefined;
}

function normalizeEnumValue<T extends string>(value: string | undefined, values: readonly T[]): T | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return values.includes(value.trim() as T) ? (value.trim() as T) : undefined;
}

type AmountSignFilter = `positive` | `negative` | `zero`;

function normalizeAmountSign(value: string | undefined): AmountSignFilter | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === `positive` || normalized === `negative` || normalized === `zero` ? normalized : undefined;
}

function buildDateRangeFilter(dateFrom?: Date, dateTo?: Date): Prisma.DateTimeFilter | undefined {
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

function buildCreatedAtCursorWhere(cursor: { createdAt: Date; id: string } | null): Prisma.LedgerEntryModelWhereInput {
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

type AssignmentSummaryRow = {
  id: string;
  resource_id: string;
  assigned_to: string;
  assigned_by: string | null;
  released_by: string | null;
  assigned_at: Date;
  released_at: Date | null;
  expires_at: Date | null;
  reason: string | null;
  assigned_to_email: string | null;
  assigned_by_email: string | null;
  released_by_email: string | null;
};

type AdminRef = { id: string; name: string | null; email: string | null };

function mapAdminRef(id: string | null, email: string | null): AdminRef | null {
  if (!id) return null;
  return { id, name: null, email };
}

type LedgerListRow = {
  id: string;
  ledgerId: string;
  type: $Enums.LedgerEntryType;
  currencyCode: $Enums.CurrencyCode;
  status: $Enums.TransactionStatus;
  amount: Prisma.Decimal;
  feesType: string | null;
  feesAmount: Prisma.Decimal | null;
  stripeId: string | null;
  idempotencyKey: string | null;
  metadata: Prisma.JsonValue | null;
  consumerId: string;
  paymentRequestId: string | null;
  createdAt: Date;
  updatedAt: Date;
  consumer?: { email: string | null } | null;
  paymentRequest?: {
    paymentRail: $Enums.PaymentRail | null;
    status: $Enums.TransactionStatus;
    payerId: string;
    requesterId: string;
  } | null;
  outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  disputes?: Array<{ id: string }>;
};

@Injectable()
export class AdminV2LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  private getEffectiveLedgerStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private parseMetadata(metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    return JSON.parse(JSON.stringify(metadata ?? {})) as Record<string, unknown>;
  }

  private deriveRail(entry: {
    metadata?: Prisma.JsonValue | null;
    paymentRequest?: { paymentRail: $Enums.PaymentRail | null } | null;
  }): $Enums.PaymentRail | null {
    const metadata = this.parseMetadata(entry.metadata);
    return (metadata.rail as $Enums.PaymentRail | undefined) ?? entry.paymentRequest?.paymentRail ?? null;
  }

  private mapLedgerRow(entry: LedgerListRow) {
    const effectiveStatus = this.getEffectiveLedgerStatus(entry);
    return {
      id: entry.id,
      ledgerId: entry.ledgerId,
      type: entry.type,
      amount: entry.amount.toString(),
      currencyCode: entry.currencyCode,
      persistedStatus: entry.status,
      effectiveStatus,
      paymentRail: this.deriveRail(entry),
      consumerId: entry.consumerId,
      consumerEmail: entry.consumer?.email ?? null,
      paymentRequestId: entry.paymentRequestId,
      paymentRequestStatus: entry.paymentRequest?.status ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      disputeCount: entry.disputes?.length ?? 0,
      staleWarning: effectiveStatus !== entry.status,
      dataFreshnessClass: `exact`,
    };
  }

  async listLedgerEntries(params?: {
    cursor?: string;
    limit?: number;
    q?: string;
    type?: string;
    status?: string;
    currencyCode?: string;
    paymentRequestId?: string;
    consumerId?: string;
    amountSign?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const limit = normalizeLimit(params?.limit);
    const cursor = decodeAdminV2Cursor(params?.cursor);
    const search = normalizeSearch(params?.q);
    const type = normalizeEnumValue(params?.type, Object.values($Enums.LedgerEntryType) as $Enums.LedgerEntryType[]);
    const status = normalizeEnumValue(
      params?.status,
      Object.values($Enums.TransactionStatus) as $Enums.TransactionStatus[],
    );
    const currencyCode = normalizeEnumValue(
      params?.currencyCode,
      Object.values($Enums.CurrencyCode) as $Enums.CurrencyCode[],
    );
    const amountSign = normalizeAmountSign(params?.amountSign);
    const createdAt = buildDateRangeFilter(params?.dateFrom, params?.dateTo);

    const include = {
      consumer: { select: { email: true } },
      paymentRequest: {
        select: {
          paymentRail: true,
          status: true,
          payerId: true,
          requesterId: true,
        },
      },
      outcomes: {
        orderBy: [{ createdAt: `desc` }, { id: `desc` }],
        take: 1,
        select: { status: true },
      },
      disputes: {
        select: { id: true },
      },
    } satisfies Prisma.LedgerEntryModelInclude;

    const searchPattern = search ? `%${search}%` : null;

    if (status) {
      const deletedSql = Prisma.sql`AND le.deleted_at IS NULL`;
      const typeSql = type ? Prisma.sql`AND le.type::text = ${type}` : Prisma.empty;
      const currencySql = currencyCode ? Prisma.sql`AND le.currency_code::text = ${currencyCode}` : Prisma.empty;
      const paymentRequestSql = params?.paymentRequestId
        ? Prisma.sql`AND le.payment_request_id::text = ${params.paymentRequestId}`
        : Prisma.empty;
      const consumerSql = params?.consumerId
        ? Prisma.sql`AND le.consumer_id::text = ${params.consumerId}`
        : Prisma.empty;
      const amountSignSql =
        amountSign === `positive`
          ? Prisma.sql`AND le.amount > 0`
          : amountSign === `negative`
            ? Prisma.sql`AND le.amount < 0`
            : amountSign === `zero`
              ? Prisma.sql`AND le.amount = 0`
              : Prisma.empty;
      const createdAtSql = createdAt?.gte
        ? createdAt.lte
          ? Prisma.sql`AND le.created_at >= ${createdAt.gte} AND le.created_at <= ${createdAt.lte}`
          : Prisma.sql`AND le.created_at >= ${createdAt.gte}`
        : createdAt?.lte
          ? Prisma.sql`AND le.created_at <= ${createdAt.lte}`
          : Prisma.empty;
      const searchSql = searchPattern
        ? Prisma.sql`
            AND (
              LOWER(COALESCE(le.stripe_id, '')) LIKE LOWER(${searchPattern})
              OR LOWER(COALESCE(le.idempotency_key, '')) LIKE LOWER(${searchPattern})
              ${
                UUID_REGEX.test(search ?? ``)
                  ? Prisma.sql`
                      OR le.id::text = ${search}
                      OR le.ledger_id::text = ${search}
                      OR le.payment_request_id::text = ${search}
                    `
                  : Prisma.empty
              }
            )
          `
        : Prisma.empty;
      const cursorSql = cursor
        ? Prisma.sql`
            AND (
              le.created_at < ${cursor.createdAt}
              OR (le.created_at = ${cursor.createdAt} AND le.id::text < ${cursor.id})
            )
          `
        : Prisma.empty;

      const pageIdRows = await this.prisma.$queryRaw<Array<{ id: string; created_at: Date }>>(Prisma.sql`
        SELECT le.id, le.created_at
        FROM ledger_entry le
        LEFT JOIN LATERAL (
          SELECT leo.status
          FROM ledger_entry_outcome leo
          WHERE leo.ledger_entry_id = le.id
          ORDER BY leo.created_at DESC, leo.id DESC
          LIMIT 1
        ) latest_outcome ON true
        WHERE COALESCE(latest_outcome.status::text, le.status::text) = ${status}
          ${deletedSql}
          ${typeSql}
          ${currencySql}
          ${paymentRequestSql}
          ${consumerSql}
          ${amountSignSql}
          ${createdAtSql}
          ${searchSql}
          ${cursorSql}
        ORDER BY le.created_at DESC, le.id DESC
        LIMIT ${limit + 1}
      `);

      const pageIds = pageIdRows.slice(0, limit).map((row) => row.id);
      const rows =
        pageIds.length === 0
          ? []
          : await this.prisma.ledgerEntryModel.findMany({
              where: { id: { in: pageIds } },
              include,
            });
      const positionById = new Map(pageIds.map((id, index) => [id, index]));
      rows.sort((left, right) => (positionById.get(left.id) ?? 0) - (positionById.get(right.id) ?? 0));
      const next = pageIdRows[limit];

      return {
        items: rows.map((row) => this.mapLedgerRow(row as LedgerListRow)),
        pageInfo: {
          nextCursor: next ? encodeAdminV2Cursor({ createdAt: next.created_at, id: next.id }) : null,
          limit,
        },
      };
    }

    const rows = await this.prisma.ledgerEntryModel.findMany({
      where: {
        deletedAt: null,
        ...buildCreatedAtCursorWhere(cursor),
        ...(type ? { type } : {}),
        ...(currencyCode ? { currencyCode } : {}),
        ...(params?.paymentRequestId ? { paymentRequestId: params.paymentRequestId } : {}),
        ...(params?.consumerId ? { consumerId: params.consumerId } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(amountSign === `positive`
          ? { amount: { gt: 0 } }
          : amountSign === `negative`
            ? { amount: { lt: 0 } }
            : amountSign === `zero`
              ? { amount: { equals: 0 } }
              : {}),
        ...(search
          ? {
              OR: [
                { stripeId: { contains: search, mode: `insensitive` } },
                { idempotencyKey: { contains: search, mode: `insensitive` } },
                ...(UUID_REGEX.test(search)
                  ? [{ id: search }, { ledgerId: search }, { paymentRequestId: search }]
                  : []),
              ],
            }
          : {}),
      },
      include,
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take: limit + 1,
    });

    const next = rows[limit];
    return {
      items: rows.slice(0, limit).map((row) => this.mapLedgerRow(row as LedgerListRow)),
      pageInfo: {
        nextCursor: next ? encodeAdminV2Cursor({ createdAt: next.createdAt, id: next.id }) : null,
        limit,
      },
    };
  }

  async getLedgerEntryCase(ledgerEntryId: string) {
    const entry = await this.prisma.ledgerEntryModel.findUnique({
      where: { id: ledgerEntryId },
      select: {
        id: true,
        ledgerId: true,
        type: true,
        currencyCode: true,
        status: true,
        amount: true,
        feesType: true,
        feesAmount: true,
        stripeId: true,
        idempotencyKey: true,
        metadata: true,
        consumerId: true,
        paymentRequestId: true,
        createdAt: true,
        updatedAt: true,
        consumer: {
          select: {
            email: true,
          },
        },
        paymentRequest: {
          select: {
            id: true,
            status: true,
            paymentRail: true,
            payerId: true,
            requesterId: true,
            amount: true,
            currencyCode: true,
            payer: { select: { email: true } },
            requester: { select: { email: true } },
          },
        },
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
        disputes: {
          orderBy: [{ createdAt: `asc` }, { id: `asc` }],
          select: {
            id: true,
            stripeDisputeId: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException(`Ledger entry not found`);
    }

    const relatedEntries = await this.prisma.ledgerEntryModel.findMany({
      where: {
        ledgerId: entry.ledgerId,
        deletedAt: null,
      },
      orderBy: [{ createdAt: `asc` }, { id: `asc` }],
      select: {
        id: true,
        type: true,
        amount: true,
        currencyCode: true,
        status: true,
        createdAt: true,
        outcomes: {
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          take: 1,
          select: { status: true },
        },
      },
    });

    const auditContext =
      entry.paymentRequestId == null
        ? []
        : await this.prisma.adminActionAuditLogModel.findMany({
            where: {
              resourceId: entry.paymentRequestId,
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

    const assignment = await this.getAssignmentContext(entry.id);

    const effectiveStatus = this.getEffectiveLedgerStatus(entry);

    return {
      id: entry.id,
      core: {
        id: entry.id,
        ledgerId: entry.ledgerId,
        type: entry.type,
        amount: entry.amount.toString(),
        currencyCode: entry.currencyCode,
        persistedStatus: entry.status,
        effectiveStatus,
        paymentRail: this.deriveRail(entry),
        feesType: entry.feesType,
        feesAmount: entry.feesAmount?.toString() ?? null,
        stripeId: entry.stripeId,
        idempotencyKey: entry.idempotencyKey,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
      consumer: {
        id: entry.consumerId,
        email: entry.consumer?.email ?? null,
      },
      paymentRequest:
        entry.paymentRequest == null
          ? null
          : {
              id: entry.paymentRequest.id,
              amount: entry.paymentRequest.amount.toString(),
              currencyCode: entry.paymentRequest.currencyCode,
              status: entry.paymentRequest.status,
              paymentRail: entry.paymentRequest.paymentRail,
              payerId: entry.paymentRequest.payerId,
              payerEmail: entry.paymentRequest.payer?.email ?? null,
              requesterId: entry.paymentRequest.requesterId,
              requesterEmail: entry.paymentRequest.requester?.email ?? null,
            },
      metadata: this.parseMetadata(entry.metadata),
      outcomes: entry.outcomes.map((outcome) => ({
        id: outcome.id,
        status: outcome.status,
        source: outcome.source,
        externalId: outcome.externalId,
        createdAt: outcome.createdAt,
      })),
      disputes: entry.disputes.map((dispute) => ({
        id: dispute.id,
        stripeDisputeId: dispute.stripeDisputeId,
        metadata: this.parseMetadata(dispute.metadata),
        createdAt: dispute.createdAt,
      })),
      relatedEntries: relatedEntries.map((item) => ({
        id: item.id,
        type: item.type,
        amount: item.amount.toString(),
        currencyCode: item.currencyCode,
        effectiveStatus: this.getEffectiveLedgerStatus(item),
        createdAt: item.createdAt,
      })),
      auditContext: auditContext.map((row) => ({
        id: row.id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resourceId,
        adminEmail: row.admin?.email ?? null,
        createdAt: row.createdAt,
      })),
      assignment,
      staleWarning: effectiveStatus !== entry.status,
      dataFreshnessClass: `exact`,
    };
  }

  private async getAssignmentContext(ledgerEntryId: string) {
    const rows = await this.prisma.$queryRaw<AssignmentSummaryRow[]>(Prisma.sql`
      SELECT
        a."id",
        a."resource_id",
        a."assigned_to",
        a."assigned_by",
        a."released_by",
        a."assigned_at",
        a."released_at",
        a."expires_at",
        a."reason",
        at."email" AS assigned_to_email,
        ab."email" AS assigned_by_email,
        rb."email" AS released_by_email
      FROM "operational_assignment" a
      LEFT JOIN "admin" at ON at."id" = a."assigned_to"
      LEFT JOIN "admin" ab ON ab."id" = a."assigned_by"
      LEFT JOIN "admin" rb ON rb."id" = a."released_by"
      WHERE a."resource_type" = 'ledger_entry'
        AND a."resource_id" = ${Prisma.sql`${ledgerEntryId}::uuid`}
      ORDER BY a."assigned_at" DESC
      LIMIT 10
    `);
    const currentRow = rows.find((row) => row.released_at === null) ?? null;
    const current = currentRow
      ? {
          id: currentRow.id,
          assignedTo: mapAdminRef(currentRow.assigned_to, currentRow.assigned_to_email) ?? {
            id: currentRow.assigned_to,
            name: null,
            email: null,
          },
          assignedBy: mapAdminRef(currentRow.assigned_by, currentRow.assigned_by_email),
          assignedAt: currentRow.assigned_at.toISOString(),
          reason: currentRow.reason,
          expiresAt: currentRow.expires_at ? currentRow.expires_at.toISOString() : null,
        }
      : null;
    const history = rows.map((row) => ({
      id: row.id,
      assignedTo: mapAdminRef(row.assigned_to, row.assigned_to_email) ?? {
        id: row.assigned_to,
        name: null,
        email: null,
      },
      assignedBy: mapAdminRef(row.assigned_by, row.assigned_by_email),
      assignedAt: row.assigned_at.toISOString(),
      releasedAt: row.released_at ? row.released_at.toISOString() : null,
      releasedBy: mapAdminRef(row.released_by, row.released_by_email),
      reason: row.reason,
      expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    }));
    return { current, history };
  }

  async listDisputes(params?: {
    cursor?: string;
    limit?: number;
    paymentRequestId?: string;
    consumerId?: string;
    q?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const limit = normalizeLimit(params?.limit);
    const cursor = decodeAdminV2Cursor(params?.cursor);
    const search = normalizeSearch(params?.q);
    const createdAt = buildDateRangeFilter(params?.dateFrom, params?.dateTo);
    const where: Prisma.LedgerEntryDisputeModelWhereInput[] = [];

    if (createdAt) {
      where.push({ createdAt });
    }

    if (cursor) {
      where.push({
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }] },
        ],
      });
    }

    if (search) {
      where.push({
        OR: [
          { stripeDisputeId: { contains: search, mode: `insensitive` } },
          ...(UUID_REGEX.test(search) ? [{ id: search }, { ledgerEntryId: search }] : []),
        ],
      });
    }

    if (params?.paymentRequestId || params?.consumerId) {
      where.push({
        ledgerEntry: {
          ...(params?.paymentRequestId ? { paymentRequestId: params.paymentRequestId } : {}),
          ...(params?.consumerId ? { consumerId: params.consumerId } : {}),
        },
      });
    }

    const rows = await this.prisma.ledgerEntryDisputeModel.findMany({
      where: where.length > 0 ? { AND: where } : {},
      include: {
        ledgerEntry: {
          select: {
            id: true,
            ledgerId: true,
            paymentRequestId: true,
            consumerId: true,
            type: true,
            amount: true,
            currencyCode: true,
            paymentRequest: {
              select: {
                paymentRail: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: `desc` }, { id: `desc` }],
      take: limit + 1,
    });

    const next = rows[limit];
    return {
      items: rows.slice(0, limit).map((row) => {
        const metadata = this.parseMetadata(row.metadata);
        return {
          id: row.id,
          stripeDisputeId: row.stripeDisputeId,
          disputeStatus:
            typeof metadata.status === `string`
              ? metadata.status
              : typeof metadata.disputeStatus === `string`
                ? metadata.disputeStatus
                : null,
          reason: typeof metadata.reason === `string` ? metadata.reason : null,
          amountMinor: typeof metadata.amount === `number` ? metadata.amount : null,
          updatedAt: typeof metadata.updatedAt === `string` ? metadata.updatedAt : null,
          createdAt: row.createdAt,
          metadata,
          ledgerEntry: {
            id: row.ledgerEntry.id,
            ledgerId: row.ledgerEntry.ledgerId,
            paymentRequestId: row.ledgerEntry.paymentRequestId,
            consumerId: row.ledgerEntry.consumerId,
            type: row.ledgerEntry.type,
            amount: row.ledgerEntry.amount.toString(),
            currencyCode: row.ledgerEntry.currencyCode,
            paymentRail: row.ledgerEntry.paymentRequest?.paymentRail ?? null,
          },
          dataFreshnessClass: `append-only-log`,
        };
      }),
      pageInfo: {
        nextCursor: next ? encodeAdminV2Cursor({ createdAt: next.createdAt, id: next.id }) : null,
        limit,
      },
    };
  }
}
