import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import {
  buildConsumerContractPaymentParticipantIdsSql,
  buildConsumerContractPaymentsWhere,
} from './consumer-contract-query-helpers';
import { type ConsumerContractItem } from './dto';
import { sqlUuid } from '../prisma-raw.utils';
import { PrismaService } from '../prisma.service';

type ContractListRow = {
  id: string;
  name: string;
  email: string;
  lastRequestId: string | null;
  lastStatus: string | null;
  lastActivity: Date | null;
  docs: number | bigint;
  paymentsCount: number | bigint;
  completedPaymentsCount: number | bigint;
  totalCount: number | bigint;
};

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
    const searchPattern = term ? `%${term}%` : null;
    const searchSql = searchPattern
      ? Prisma.sql`
          AND (
            LOWER(c.email) LIKE LOWER(${searchPattern})
            OR LOWER(COALESCE(c.name, '')) LIKE LOWER(${searchPattern})
          )
        `
      : Prisma.empty;
    const participantPaymentIdsSql = buildConsumerContractPaymentParticipantIdsSql(consumerId, consumerEmail);
    const statusFilterSql =
      normalizedStatusFilter == null
        ? Prisma.empty
        : normalizedStatusFilter === `no_activity`
          ? Prisma.sql`AND rc.last_status IS NULL`
          : Prisma.sql`AND rc.last_status = ${normalizedStatusFilter}`;
    const documentsFilterSql =
      normalizedHasDocumentsFilter == null
        ? Prisma.empty
        : normalizedHasDocumentsFilter === `yes`
          ? Prisma.sql`AND rc.docs > 0`
          : Prisma.sql`AND rc.docs = 0`;
    const paymentsFilterSql =
      normalizedHasPaymentsFilter == null
        ? Prisma.empty
        : normalizedHasPaymentsFilter === `yes`
          ? Prisma.sql`AND rc.payments_count > 0`
          : Prisma.sql`AND rc.payments_count = 0`;
    const orderBySql =
      normalizedSort === `name`
        ? Prisma.sql`ORDER BY LOWER(rc.name) ASC, rc.name ASC, rc.id ASC`
        : normalizedSort === `payments_count`
          ? Prisma.sql`
              ORDER BY
                rc.payments_count DESC,
                COALESCE(rc.last_activity, rc.contact_updated_at) DESC,
                LOWER(rc.name) ASC,
                rc.id ASC
            `
          : Prisma.sql`
              ORDER BY
                COALESCE(rc.last_activity, rc.contact_updated_at) DESC,
                LOWER(rc.name) ASC,
                rc.id ASC
            `;
    const matchedPaymentsSql = Prisma.sql`
      participant_payments_base AS (
        SELECT
          pr.id AS payment_id,
          pr.updated_at,
          pr.created_at,
          LOWER(
            CASE
              WHEN COALESCE(
                latest_outcome.status::text,
                latest_le.status::text,
                pr.status::text
              ) = 'WAITING_RECIPIENT_APPROVAL'
                THEN 'WAITING'
              ELSE COALESCE(
                latest_outcome.status::text,
                latest_le.status::text,
                pr.status::text
              )
            END
          ) AS effective_status,
          LOWER(COALESCE(requester.email, pr.requester_email, '')) AS requester_email,
          LOWER(COALESCE(payer.email, pr.payer_email, '')) AS payer_email
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
      ),
      payment_counterparties AS (
        SELECT
          payment_id,
          updated_at,
          created_at,
          effective_status,
          requester_email AS counterparty_email
        FROM participant_payments_base
        WHERE requester_email <> ''
        UNION
        SELECT
          payment_id,
          updated_at,
          created_at,
          effective_status,
          payer_email AS counterparty_email
        FROM participant_payments_base
        WHERE payer_email <> ''
      ),
      matched_payments AS (
        SELECT
          fc.id AS contact_id,
          pc.payment_id,
          pc.updated_at,
          pc.created_at,
          pc.effective_status
        FROM payment_counterparties pc
        JOIN filtered_contacts fc ON pc.counterparty_email = LOWER(fc.email)
      )
    `;

    const rows = await this.prisma.$queryRaw<ContractListRow[]>(Prisma.sql`
      WITH participant_payment_ids AS (
        ${participantPaymentIdsSql}
      ),
      filtered_contacts AS (
        SELECT
          c.id,
          COALESCE(c.name, c.email) AS name,
          c.email,
          c.updated_at
        FROM contact c
        WHERE c.consumer_id = ${sqlUuid(consumerId)}
          AND c.deleted_at IS NULL
          ${searchSql}
      ),
      ${matchedPaymentsSql},
      docs_by_contact AS (
        SELECT
          mp.contact_id,
          COUNT(DISTINCT pra.resource_id)::int AS docs
        FROM matched_payments mp
        JOIN payment_request_attachment pra
          ON pra.payment_request_id = mp.payment_id
         AND pra.deleted_at IS NULL
        JOIN resource r
          ON r.id = pra.resource_id
         AND r.deleted_at IS NULL
        GROUP BY mp.contact_id
      ),
      payment_stats AS (
        SELECT
          mp.contact_id,
          COUNT(*)::int AS payments_count,
          COUNT(*) FILTER (WHERE mp.effective_status = 'completed')::int AS completed_payments_count,
          MAX(mp.updated_at) AS last_activity
        FROM matched_payments mp
        GROUP BY mp.contact_id
      ),
      operating_payments AS (
        SELECT
          ranked.contact_id,
          ranked.payment_id,
          ranked.effective_status AS last_status
        FROM (
          SELECT
            mp.contact_id,
            mp.payment_id,
            mp.effective_status,
            ROW_NUMBER() OVER (
              PARTITION BY mp.contact_id
              ORDER BY
                CASE mp.effective_status
                  WHEN 'draft' THEN 0
                  WHEN 'pending' THEN 1
                  WHEN 'waiting' THEN 2
                  ELSE 3
                END,
                mp.updated_at DESC,
                mp.created_at DESC,
                mp.payment_id DESC
            ) AS operating_rank
          FROM matched_payments mp
        ) ranked
        WHERE ranked.operating_rank = 1
      ),
      ranked_contracts AS (
        SELECT
          fc.id,
          fc.name,
          fc.email,
          op.payment_id AS last_request_id,
          op.last_status AS last_status,
          ps.last_activity AS last_activity,
          COALESCE(db.docs, 0) AS docs,
          COALESCE(ps.payments_count, 0) AS payments_count,
          COALESCE(ps.completed_payments_count, 0) AS completed_payments_count,
          fc.updated_at AS contact_updated_at
        FROM filtered_contacts fc
        LEFT JOIN operating_payments op ON op.contact_id = fc.id
        LEFT JOIN payment_stats ps ON ps.contact_id = fc.id
        LEFT JOIN docs_by_contact db ON db.contact_id = fc.id
      )
      SELECT
        rc.id,
        rc.name,
        rc.email,
        rc.last_request_id AS "lastRequestId",
        rc.last_status AS "lastStatus",
        rc.last_activity AS "lastActivity",
        rc.docs,
        rc.payments_count AS "paymentsCount",
        rc.completed_payments_count AS "completedPaymentsCount",
        COUNT(*) OVER()::int AS "totalCount"
      FROM ranked_contracts rc
      WHERE 1 = 1
        ${statusFilterSql}
        ${documentsFilterSql}
        ${paymentsFilterSql}
      ${orderBySql}
      LIMIT ${safePageSize}
      OFFSET ${offset}
    `);

    if (rows.length === 0 && safePage > 1) {
      const countRows = await this.prisma.$queryRaw<Array<{ totalCount: number | bigint }>>(Prisma.sql`
        WITH participant_payment_ids AS (
          ${participantPaymentIdsSql}
        ),
        filtered_contacts AS (
          SELECT
            c.id,
            COALESCE(c.name, c.email) AS name,
            c.email,
            c.updated_at
          FROM contact c
          WHERE c.consumer_id = ${sqlUuid(consumerId)}
            AND c.deleted_at IS NULL
            ${searchSql}
        ),
        ${matchedPaymentsSql},
        docs_by_contact AS (
          SELECT
            mp.contact_id,
            COUNT(DISTINCT pra.resource_id)::int AS docs
          FROM matched_payments mp
          JOIN payment_request_attachment pra
            ON pra.payment_request_id = mp.payment_id
           AND pra.deleted_at IS NULL
          JOIN resource r
            ON r.id = pra.resource_id
           AND r.deleted_at IS NULL
          GROUP BY mp.contact_id
        ),
        payment_stats AS (
          SELECT
            mp.contact_id,
            COUNT(*)::int AS payments_count,
            COUNT(*) FILTER (WHERE mp.effective_status = 'completed')::int AS completed_payments_count
          FROM matched_payments mp
          GROUP BY mp.contact_id
        ),
        operating_payments AS (
          SELECT
            ranked.contact_id,
            ranked.effective_status AS last_status
          FROM (
            SELECT
              mp.contact_id,
              mp.effective_status,
              ROW_NUMBER() OVER (
                PARTITION BY mp.contact_id
                ORDER BY
                  CASE mp.effective_status
                    WHEN 'draft' THEN 0
                    WHEN 'pending' THEN 1
                    WHEN 'waiting' THEN 2
                    ELSE 3
                  END,
                  mp.updated_at DESC,
                  mp.created_at DESC,
                  mp.payment_id DESC
              ) AS operating_rank
            FROM matched_payments mp
          ) ranked
          WHERE ranked.operating_rank = 1
        ),
        ranked_contracts AS (
          SELECT
            fc.id,
            op.last_status,
            COALESCE(db.docs, 0) AS docs,
            COALESCE(ps.payments_count, 0) AS payments_count
          FROM filtered_contacts fc
          LEFT JOIN operating_payments op ON op.contact_id = fc.id
          LEFT JOIN payment_stats ps ON ps.contact_id = fc.id
          LEFT JOIN docs_by_contact db ON db.contact_id = fc.id
        )
        SELECT COUNT(*)::int AS "totalCount"
        FROM ranked_contracts rc
        WHERE 1 = 1
          ${statusFilterSql}
          ${documentsFilterSql}
          ${paymentsFilterSql}
      `);

      return {
        items: [],
        total: countRows.length > 0 ? Number(countRows[0].totalCount) : 0,
        page: safePage,
        pageSize: safePageSize,
      };
    }

    const total = rows.length > 0 ? Number(rows[0].totalCount) : 0;
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        lastRequestId: row.lastRequestId,
        lastStatus: row.lastStatus,
        lastActivity: row.lastActivity,
        docs: Number(row.docs),
        paymentsCount: Number(row.paymentsCount),
        completedPaymentsCount: Number(row.completedPaymentsCount),
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
    };
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
