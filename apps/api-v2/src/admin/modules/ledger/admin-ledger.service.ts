import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

const SEARCH_MAX_LEN = 200;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEDGER_ENTRY_TYPES = Object.values($Enums.LedgerEntryType) as string[];
const TRANSACTION_STATUSES = Object.values($Enums.TransactionStatus) as string[];

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
  paymentRequest?: { paymentRail: $Enums.PaymentRail | null } | null;
  outcomes?: Array<{ status: $Enums.TransactionStatus }>;
};

@Injectable()
export class AdminLedgersService {
  constructor(private readonly prisma: PrismaService) {}

  private getEffectiveLedgerStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private deriveRail(entry: {
    metadata?: Prisma.JsonValue | null;
    paymentRequest?: { paymentRail: $Enums.PaymentRail | null } | null;
  }): $Enums.PaymentRail | null {
    const metadata = JSON.parse(JSON.stringify(entry.metadata ?? {})) as { rail?: $Enums.PaymentRail | null };
    return metadata.rail ?? entry.paymentRequest?.paymentRail ?? null;
  }

  private mapLedgerRow(entry: LedgerListRow) {
    return {
      ...entry,
      status: this.getEffectiveLedgerStatus(entry),
      rail: this.deriveRail(entry),
    };
  }

  /** Bounded list for admin. Search/filter fintech-safe. */
  async findAll(params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    type?: string;
    status?: string;
    includeDeleted?: boolean;
  }) {
    const pageSize = Math.min(Math.max(params?.pageSize ?? 10, 1), 500);
    const page = Math.max(params?.page ?? 1, 1);
    const skip = (page - 1) * pageSize;

    const search =
      typeof params?.q === `string` && params.q.trim().length > 0
        ? params.q.trim().slice(0, SEARCH_MAX_LEN)
        : undefined;
    const type =
      params?.type && LEDGER_ENTRY_TYPES.includes(params.type) ? (params.type as $Enums.LedgerEntryType) : undefined;
    const status =
      params?.status && TRANSACTION_STATUSES.includes(params.status)
        ? (params.status as $Enums.TransactionStatus)
        : undefined;

    const baseWhere: Prisma.LedgerEntryModelWhereInput = {
      ...(params?.includeDeleted !== true && { deletedAt: null }),
      ...(type && { type }),
      ...(search && {
        OR: [
          { stripeId: { contains: search, mode: `insensitive` } },
          { idempotencyKey: { contains: search, mode: `insensitive` } },
          ...(UUID_REGEX.test(search)
            ? [{ id: { equals: search } }, { ledgerId: { equals: search } }, { paymentRequestId: { equals: search } }]
            : []),
        ],
      }),
    };

    const include = {
      paymentRequest: {
        select: { paymentRail: true },
      },
      outcomes: {
        orderBy: { createdAt: `desc` },
        take: 1,
        select: { status: true },
      },
    } satisfies Prisma.LedgerEntryModelInclude;

    const useDbBackedStatusFilter = status && typeof this.prisma.$queryRaw === `function`;

    if (useDbBackedStatusFilter) {
      const searchPattern = search ? `%${search}%` : null;
      const deletedSql = params?.includeDeleted === true ? Prisma.empty : Prisma.sql`AND le.deleted_at IS NULL`;
      const typeSql = type ? Prisma.sql`AND le.type::text = ${type}` : Prisma.empty;
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
      const filteredLedgerIdsSql = Prisma.sql`
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
          ${searchSql}
      `;
      const [totalRows, pageIdRows] = await Promise.all([
        this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
          WITH filtered AS (${filteredLedgerIdsSql})
          SELECT COUNT(*)::int AS total
          FROM filtered
        `),
        this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          WITH filtered AS (${filteredLedgerIdsSql})
          SELECT id
          FROM filtered
          ORDER BY created_at DESC, id DESC
          OFFSET ${skip}
          LIMIT ${pageSize}
        `),
      ]);
      const pageIds = pageIdRows.map((row) => row.id);
      const items =
        pageIds.length === 0
          ? []
          : await this.prisma.ledgerEntryModel.findMany({
              where: { id: { in: pageIds } },
              include,
            });
      const positionById = new Map(pageIds.map((id, index) => [id, index]));
      items.sort((left, right) => (positionById.get(left.id) ?? 0) - (positionById.get(right.id) ?? 0));

      return {
        items: items.map((item) => this.mapLedgerRow(item as LedgerListRow)),
        total: Number(totalRows[0]?.total ?? 0),
        page,
        pageSize,
      };
    }

    if (status) {
      const rows = await this.prisma.ledgerEntryModel.findMany({
        where: baseWhere,
        include,
        orderBy: { createdAt: `desc` },
        take: 2000,
      });
      const filtered = rows
        .map((row) => this.mapLedgerRow(row as LedgerListRow))
        .filter((row) => row.status === status);

      return {
        items: filtered.slice(skip, skip + pageSize),
        total: filtered.length,
        page,
        pageSize,
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.ledgerEntryModel.count({ where: baseWhere }),
      this.prisma.ledgerEntryModel.findMany({
        where: baseWhere,
        include,
        orderBy: { createdAt: `desc` },
        skip,
        take: pageSize,
      }),
    ]);

    return { items: items.map((item) => this.mapLedgerRow(item as LedgerListRow)), total, page, pageSize };
  }
}
