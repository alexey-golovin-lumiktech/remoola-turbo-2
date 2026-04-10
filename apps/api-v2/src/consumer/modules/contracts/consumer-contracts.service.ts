import { Injectable, NotFoundException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerContractDetails, ConsumerContractItem } from './dto';
import { PrismaService } from '../../../shared/prisma.service';
import { normalizeConsumerFacingTransactionStatus } from '../../consumer-status-compat';
import { buildConsumerDocumentDownloadUrl } from '../documents/document-download-url';

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

@Injectable()
export class ConsumerContractsService {
  constructor(private prisma: PrismaService) {}

  private static readonly STATUS_FILTERS = new Set([`draft`, `completed`, `waiting`, `pending`, `no_activity`]);
  private static readonly PRESENCE_FILTERS = new Set([`yes`, `no`]);
  private static readonly SORT_OPTIONS = new Set([`recent_activity`, `name`, `payments_count`]);
  private static readonly OPERATING_STATUS_PRIORITY = [`draft`, `pending`, `waiting`] as const;

  private normalizeEmail(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? ``;
  }

  private async getConsumerEmail(consumerId: string): Promise<string | null> {
    const consumerModel = this.prisma.consumerModel;
    if (!consumerModel || typeof consumerModel.findUnique !== `function`) {
      return null;
    }

    const consumer = await consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });

    return consumer?.email?.trim().toLowerCase() ?? null;
  }

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

  private normalizeStatusFilter(value: string | null | undefined): string | null {
    const normalized = value?.trim().toLowerCase() ?? ``;
    return ConsumerContractsService.STATUS_FILTERS.has(normalized) ? normalized : null;
  }

  private normalizePresenceFilter(value: string | null | undefined): `yes` | `no` | null {
    const normalized = value?.trim().toLowerCase() ?? ``;
    return ConsumerContractsService.PRESENCE_FILTERS.has(normalized) ? (normalized as `yes` | `no`) : null;
  }

  private normalizeSort(value: string | null | undefined): `recent_activity` | `name` | `payments_count` {
    const normalized = value?.trim().toLowerCase() ?? ``;
    return ConsumerContractsService.SORT_OPTIONS.has(normalized)
      ? (normalized as `recent_activity` | `name` | `payments_count`)
      : `recent_activity`;
  }

  private matchesStatusFilter(lastStatus: string | null, filter: string | null): boolean {
    if (!filter) return true;
    if (filter === `no_activity`) return lastStatus == null;
    return lastStatus === filter;
  }

  private matchesPresenceFilter(hasValue: boolean, filter: `yes` | `no` | null): boolean {
    if (!filter) return true;
    return filter === `yes` ? hasValue : !hasValue;
  }

  private sortContractPaymentsByUpdatedAt<
    T extends {
      updatedAt: Date;
    },
  >(payments: T[]): T[] {
    return [...payments].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  }

  private getLatestRelationshipPayment<
    T extends {
      updatedAt: Date;
    },
  >(payments: T[]): T | null {
    return this.sortContractPaymentsByUpdatedAt(payments)[0] ?? null;
  }

  private getOperatingRelationshipPayment<
    T extends {
      status: string;
      updatedAt: Date;
    },
  >(payments: T[]): T | null {
    const orderedPayments = this.sortContractPaymentsByUpdatedAt(payments);
    for (const status of ConsumerContractsService.OPERATING_STATUS_PRIORITY) {
      const matchingPayment = orderedPayments.find((payment) => payment.status === status);
      if (matchingPayment) {
        return matchingPayment;
      }
    }
    return orderedPayments[0] ?? null;
  }

  private buildPaymentParticipantWhere(consumerId: string, consumerEmail: string | null) {
    return [
      { requesterId: consumerId },
      { payerId: consumerId },
      ...(consumerEmail
        ? [
            {
              requesterId: null,
              requesterEmail: { equals: consumerEmail, mode: `insensitive` as const },
            },
            {
              payerId: null,
              payerEmail: { equals: consumerEmail, mode: `insensitive` as const },
            },
          ]
        : []),
    ];
  }

  private buildContractCounterpartyWhere(emails: string[]) {
    return emails.flatMap((email) => [
      { payer: { email: { equals: email, mode: `insensitive` as const } } },
      { requester: { email: { equals: email, mode: `insensitive` as const } } },
      { payerEmail: { equals: email, mode: `insensitive` as const } },
      { requesterEmail: { equals: email, mode: `insensitive` as const } },
    ]);
  }

  private buildContractPaymentsWhere(consumerId: string, contractEmails: string[], consumerEmail: string | null) {
    return {
      AND: [
        { deletedAt: null },
        { OR: this.buildPaymentParticipantWhere(consumerId, consumerEmail) },
        { OR: this.buildContractCounterpartyWhere(contractEmails) },
      ],
    };
  }

  private buildPaymentParticipantSql(consumerId: string, consumerEmail: string | null) {
    return consumerEmail
      ? Prisma.sql`
          (
            pr.requester_id::text = ${consumerId}
            OR pr.payer_id::text = ${consumerId}
            OR (pr.requester_id IS NULL AND LOWER(COALESCE(pr.requester_email, '')) = LOWER(${consumerEmail}))
            OR (pr.payer_id IS NULL AND LOWER(COALESCE(pr.payer_email, '')) = LOWER(${consumerEmail}))
          )
        `
      : Prisma.sql`
          (
            pr.requester_id::text = ${consumerId}
            OR pr.payer_id::text = ${consumerId}
          )
        `;
  }

  private async getContractsRaw(
    consumerId: string,
    safePage: number,
    safePageSize: number,
    term: string,
    normalizedStatusFilter: string | null,
    normalizedHasDocumentsFilter: `yes` | `no` | null,
    normalizedHasPaymentsFilter: `yes` | `no` | null,
    normalizedSort: `recent_activity` | `name` | `payments_count`,
  ): Promise<{ items: ConsumerContractItem[]; total: number; page: number; pageSize: number }> {
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
    const participantSql = this.buildPaymentParticipantSql(consumerId, consumerEmail);
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

    const rows = await this.prisma.$queryRaw<ContractListRow[]>(Prisma.sql`
      WITH filtered_contacts AS (
        SELECT
          c.id,
          COALESCE(c.name, c.email) AS name,
          c.email,
          c.updated_at
        FROM contact c
        WHERE c.consumer_id::text = ${consumerId}
          AND c.deleted_at IS NULL
          ${searchSql}
      ),
      matched_payments AS (
        SELECT
          fc.id AS contact_id,
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
          ) AS effective_status
        FROM filtered_contacts fc
        JOIN payment_request pr
          ON pr.deleted_at IS NULL
         AND ${participantSql}
        LEFT JOIN consumer requester ON requester.id = pr.requester_id
        LEFT JOIN consumer payer ON payer.id = pr.payer_id
        LEFT JOIN LATERAL (
          SELECT le.id, le.status
          FROM ledger_entry le
          WHERE le.payment_request_id = pr.id
            AND le.consumer_id::text = ${consumerId}
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
        WHERE
          LOWER(COALESCE(requester.email, pr.requester_email, '')) = LOWER(fc.email)
          OR LOWER(COALESCE(payer.email, pr.payer_email, '')) = LOWER(fc.email)
      ),
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
        WITH filtered_contacts AS (
          SELECT
            c.id,
            COALESCE(c.name, c.email) AS name,
            c.email,
            c.updated_at
          FROM contact c
          WHERE c.consumer_id::text = ${consumerId}
            AND c.deleted_at IS NULL
            ${searchSql}
        ),
        matched_payments AS (
          SELECT
            fc.id AS contact_id,
            pr.id AS payment_id,
            pr.updated_at,
            pr.created_at,
            LOWER(
              CASE
                WHEN COALESCE(
                  latest_outcome.status::text,
                  latest_le.status::text,
                  pr.status::text,
                ) = 'WAITING_RECIPIENT_APPROVAL'
                  THEN 'WAITING'
                ELSE COALESCE(
                  latest_outcome.status::text,
                  latest_le.status::text,
                  pr.status::text,
                )
              END
            ) AS effective_status
          FROM filtered_contacts fc
          JOIN payment_request pr
            ON pr.deleted_at IS NULL
           AND ${participantSql}
          LEFT JOIN consumer requester ON requester.id = pr.requester_id
          LEFT JOIN consumer payer ON payer.id = pr.payer_id
          LEFT JOIN LATERAL (
            SELECT le.id, le.status
            FROM ledger_entry le
            WHERE le.payment_request_id = pr.id
              AND le.consumer_id::text = ${consumerId}
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
          WHERE
            LOWER(COALESCE(requester.email, pr.requester_email, '')) = LOWER(fc.email)
            OR LOWER(COALESCE(payer.email, pr.payer_email, '')) = LOWER(fc.email)
        ),
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

  private async getContractsInMemory(
    consumerId: string,
    safePage: number,
    safePageSize: number,
    term: string,
    normalizedStatusFilter: string | null,
    normalizedHasDocumentsFilter: `yes` | `no` | null,
    normalizedHasPaymentsFilter: `yes` | `no` | null,
    normalizedSort: `recent_activity` | `name` | `payments_count`,
  ): Promise<{ items: ConsumerContractItem[]; total: number; page: number; pageSize: number }> {
    const contactsWhere = {
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
    };
    const contacts = await this.prisma.contactModel.findMany({
      where: contactsWhere,
      orderBy: { updatedAt: `desc` },
    });

    const emails = Array.from(new Set(contacts.map((contact) => this.normalizeEmail(contact.email)).filter(Boolean)));
    if (emails.length === 0) {
      return { items: [], total: 0, page: safePage, pageSize: safePageSize };
    }
    const consumerEmail = await this.getConsumerEmail(consumerId);

    const paymentRequests = await this.prisma.paymentRequestModel.findMany({
      where: this.buildContractPaymentsWhere(consumerId, emails, consumerEmail),
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

    const items = contacts.map((contact) => {
      const normalizedContactEmail = this.normalizeEmail(contact.email);
      const filteredPaymentRequests = paymentRequests.filter((paymentRequest) => {
        const payerEmail = this.normalizeEmail(paymentRequest.payer?.email ?? paymentRequest.payerEmail);
        const requesterEmail = this.normalizeEmail(paymentRequest.requester?.email ?? paymentRequest.requesterEmail);
        return payerEmail === normalizedContactEmail || requesterEmail === normalizedContactEmail;
      });
      const contractPayments = filteredPaymentRequests.map((paymentRequest) =>
        this.mapContractListPayment(consumerId, paymentRequest),
      );
      const latestRelationshipPayment = this.getLatestRelationshipPayment(contractPayments);
      const operatingPayment = this.getOperatingRelationshipPayment(contractPayments);

      const paymentsCount = filteredPaymentRequests.length;
      const completedPaymentsCount = filteredPaymentRequests.filter((paymentRequest) => {
        const latestConsumerLedgerEntry = paymentRequest.ledgerEntries[0];
        return (
          normalizeConsumerFacingTransactionStatus(
            this.getEffectivePaymentRequestStatus(paymentRequest.status, latestConsumerLedgerEntry),
          ).toLowerCase() === `completed`
        );
      }).length;
      const docs = this.countUniqueAttachmentResources(filteredPaymentRequests);

      return {
        id: contact.id,
        name: contact.name ?? contact.email,
        email: contact.email,
        lastRequestId: operatingPayment?.id ?? null,
        lastStatus: operatingPayment?.status ?? null,
        lastActivity: latestRelationshipPayment?.updatedAt ?? null,
        docs,
        paymentsCount,
        completedPaymentsCount,
        contactUpdatedAt: contact.updatedAt,
      };
    });

    const filteredItems = items
      .filter((item) => this.matchesStatusFilter(item.lastStatus, normalizedStatusFilter))
      .filter((item) => this.matchesPresenceFilter(item.docs > 0, normalizedHasDocumentsFilter))
      .filter((item) => this.matchesPresenceFilter(item.paymentsCount > 0, normalizedHasPaymentsFilter))
      .sort((left, right) => {
        if (normalizedSort === `name`) {
          return left.name.localeCompare(right.name, `en`, { sensitivity: `base` });
        }

        if (normalizedSort === `payments_count`) {
          if (right.paymentsCount !== left.paymentsCount) {
            return right.paymentsCount - left.paymentsCount;
          }
        }

        const leftTimestamp = (left.lastActivity ?? left.contactUpdatedAt).getTime();
        const rightTimestamp = (right.lastActivity ?? right.contactUpdatedAt).getTime();
        if (rightTimestamp !== leftTimestamp) {
          return rightTimestamp - leftTimestamp;
        }
        return left.name.localeCompare(right.name, `en`, { sensitivity: `base` });
      });
    const total = filteredItems.length;
    const start = (safePage - 1) * safePageSize;

    return {
      items: filteredItems.slice(start, start + safePageSize).map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        lastRequestId: item.lastRequestId,
        lastStatus: item.lastStatus,
        lastActivity: item.lastActivity,
        docs: item.docs,
        paymentsCount: item.paymentsCount,
        completedPaymentsCount: item.completedPaymentsCount,
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  private mapContractPayment(
    consumerId: string,
    contractEmail: string,
    paymentRequest: {
      id: string;
      amount: { toString(): string };
      status: $Enums.TransactionStatus;
      createdAt: Date;
      updatedAt: Date;
      paymentRail: $Enums.PaymentRail | null;
      payer?: { email?: string | null } | null;
      payerEmail?: string | null;
      requester?: { email?: string | null } | null;
      requesterEmail?: string | null;
      ledgerEntries: Array<{
        consumerId?: string;
        status: $Enums.TransactionStatus;
        outcomes?: Array<{ status: $Enums.TransactionStatus }>;
      }>;
    },
  ) {
    const latestConsumerLedgerEntry = paymentRequest.ledgerEntries.find(
      (entry) => !entry.consumerId || entry.consumerId === consumerId,
    );
    const status = normalizeConsumerFacingTransactionStatus(
      this.getEffectivePaymentRequestStatus(paymentRequest.status, latestConsumerLedgerEntry),
    ).toLowerCase();
    const normalizedContractEmail = this.normalizeEmail(contractEmail);
    const payerEmail = this.normalizeEmail(paymentRequest.payer?.email ?? paymentRequest.payerEmail);
    const requesterEmail = this.normalizeEmail(paymentRequest.requester?.email ?? paymentRequest.requesterEmail);
    const role =
      payerEmail === normalizedContractEmail
        ? `REQUESTER`
        : requesterEmail === normalizedContractEmail
          ? `PAYER`
          : `REQUESTER`;

    return {
      id: paymentRequest.id,
      amount: paymentRequest.amount.toString(),
      status,
      createdAt: paymentRequest.createdAt,
      updatedAt: paymentRequest.updatedAt,
      role,
      paymentRail: paymentRequest.paymentRail,
    };
  }

  private mapContractListPayment(
    consumerId: string,
    paymentRequest: {
      id: string;
      status: $Enums.TransactionStatus;
      updatedAt: Date;
      ledgerEntries: Array<{
        consumerId?: string;
        status: $Enums.TransactionStatus;
        outcomes?: Array<{ status: $Enums.TransactionStatus }>;
      }>;
    },
  ) {
    const latestConsumerLedgerEntry = paymentRequest.ledgerEntries.find(
      (entry) => !entry.consumerId || entry.consumerId === consumerId,
    );

    return {
      id: paymentRequest.id,
      status: normalizeConsumerFacingTransactionStatus(
        this.getEffectivePaymentRequestStatus(paymentRequest.status, latestConsumerLedgerEntry),
      ).toLowerCase(),
      updatedAt: paymentRequest.updatedAt,
    };
  }

  private countUniqueAttachmentResources(
    paymentRequests: Array<{
      attachments: Array<{
        resourceId?: string | null;
        id?: string | null;
      }>;
    }>,
  ) {
    const resourceIds = new Set<string>();
    for (const paymentRequest of paymentRequests) {
      for (const attachment of paymentRequest.attachments) {
        const resourceId = attachment.resourceId?.trim() || attachment.id?.trim();
        if (resourceId) {
          resourceIds.add(resourceId);
        }
      }
    }
    return resourceIds.size;
  }

  private buildContractDocuments(
    paymentRequests: Array<{
      status: $Enums.TransactionStatus;
      id: string;
      attachments: Array<{
        resource: {
          id: string;
          originalName: string;
          createdAt: Date | null;
          resourceTags: Array<{ tag: { name: string } }>;
        };
      }>;
    }>,
    backendBaseUrl?: string,
  ) {
    const byResource = new Map<
      string,
      {
        id: string;
        name: string;
        downloadUrl: string;
        createdAt: Date;
        tags: string[];
        attachedDraftPaymentRequestIds: string[];
        attachedNonDraftPaymentRequestIds: string[];
      }
    >();

    for (const paymentRequest of paymentRequests) {
      for (const attachment of paymentRequest.attachments) {
        const resource = attachment.resource;
        const current = byResource.get(resource.id);
        const nextDraftIds = new Set(current?.attachedDraftPaymentRequestIds ?? []);
        const nextNonDraftIds = new Set(current?.attachedNonDraftPaymentRequestIds ?? []);

        if (paymentRequest.status === $Enums.TransactionStatus.DRAFT) {
          nextDraftIds.add(paymentRequest.id);
        } else {
          nextNonDraftIds.add(paymentRequest.id);
        }

        byResource.set(resource.id, {
          id: resource.id,
          name: resource.originalName,
          downloadUrl: buildConsumerDocumentDownloadUrl(resource.id, backendBaseUrl),
          createdAt: resource.createdAt ?? current?.createdAt ?? new Date(0),
          tags: Array.from(new Set([...(current?.tags ?? []), ...resource.resourceTags.map((tag) => tag.tag.name)])),
          attachedDraftPaymentRequestIds: Array.from(nextDraftIds),
          attachedNonDraftPaymentRequestIds: Array.from(nextNonDraftIds),
        });
      }
    }

    return Array.from(byResource.values())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map((document) => ({
        ...document,
        isAttachedToDraftPaymentRequest: document.attachedDraftPaymentRequestIds.length > 0,
        isAttachedToNonDraftPaymentRequest: document.attachedNonDraftPaymentRequestIds.length > 0,
      }));
  }

  async getContracts(
    consumerId: string,
    page = 1,
    pageSize = 10,
    query?: string,
    status?: string,
    hasDocuments?: string,
    hasPayments?: string,
    sort?: string,
  ): Promise<{ items: ConsumerContractItem[]; total: number; page: number; pageSize: number }> {
    const safePage = Math.max(1, Math.floor(Number(page)) || 1);
    const safePageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize)) || 10));
    const term = query?.trim() ?? ``;
    const normalizedStatusFilter = this.normalizeStatusFilter(status);
    const normalizedHasDocumentsFilter = this.normalizePresenceFilter(hasDocuments);
    const normalizedHasPaymentsFilter = this.normalizePresenceFilter(hasPayments);
    const normalizedSort = this.normalizeSort(sort);
    if (typeof this.prisma.$queryRaw === `function`) {
      return this.getContractsRaw(
        consumerId,
        safePage,
        safePageSize,
        term,
        normalizedStatusFilter,
        normalizedHasDocumentsFilter,
        normalizedHasPaymentsFilter,
        normalizedSort,
      );
    }

    return this.getContractsInMemory(
      consumerId,
      safePage,
      safePageSize,
      term,
      normalizedStatusFilter,
      normalizedHasDocumentsFilter,
      normalizedHasPaymentsFilter,
      normalizedSort,
    );
  }

  async getDetails(id: string, consumerId: string, backendBaseUrl?: string): Promise<ConsumerContractDetails> {
    const contact = await this.prisma.contactModel.findFirst({
      where: {
        id,
        consumerId,
        deletedAt: null,
      },
    });

    if (!contact) {
      throw new NotFoundException(errorCodes.CONTACT_NOT_FOUND);
    }

    const consumerEmail = await this.getConsumerEmail(consumerId);

    const paymentRequests = await this.prisma.paymentRequestModel.findMany({
      where: this.buildContractPaymentsWhere(consumerId, [this.normalizeEmail(contact.email)], consumerEmail),
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

    const payments = paymentRequests.map((paymentRequest) =>
      this.mapContractPayment(consumerId, contact.email, paymentRequest),
    );
    const documents = this.buildContractDocuments(paymentRequests, backendBaseUrl);
    const latestPayment = this.getLatestRelationshipPayment(payments);
    const operatingPayment = this.getOperatingRelationshipPayment(payments);

    return {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      updatedAt: contact.updatedAt,
      address: JSON.parse(JSON.stringify(contact.address)),
      summary: {
        lastStatus: operatingPayment?.status ?? null,
        lastActivity: latestPayment?.updatedAt ?? null,
        lastRequestId: operatingPayment?.id ?? null,
        documentsCount: documents.length,
        paymentsCount: payments.length,
        completedPaymentsCount: payments.filter((payment) => payment.status === `completed`).length,
        draftPaymentsCount: payments.filter((payment) => payment.status === `draft`).length,
        pendingPaymentsCount: payments.filter((payment) => payment.status === `pending`).length,
        waitingPaymentsCount: payments.filter((payment) => payment.status === `waiting`).length,
      },
      payments,
      documents,
    };
  }
}
