import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { type DocumentListItem, type DocumentListRow, formatConsumerDocumentRows } from './consumer-document-mapper';
import {
  buildConsumerDocumentKindSql,
  buildConsumerDocumentPaymentParticipantIdsSql,
} from './consumer-document-query-helpers';
import { sqlUuid } from '../../../shared/prisma-raw.utils';
import { PrismaService } from '../../../shared/prisma.service';

type DocumentListResult = {
  items: DocumentListItem[];
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
    const offset = (safePage - 1) * safePageSize;
    const participantPaymentIdsSql = buildConsumerDocumentPaymentParticipantIdsSql(consumerId, consumerEmail);

    if (contractEmail) {
      if (kindFilter && kindFilter !== `PAYMENT`) {
        return { items: [], total: 0, page: safePage, pageSize: safePageSize };
      }

      const rows = await this.prisma.$queryRaw<DocumentListRow[]>(Prisma.sql`
        WITH participant_payment_ids AS (
          ${participantPaymentIdsSql}
        ),
        scoped_payments AS (
          SELECT
            pr.id,
            pr.status
          FROM payment_request pr
          JOIN participant_payment_ids ppi ON ppi.id = pr.id
          LEFT JOIN consumer requester ON requester.id = pr.requester_id
          LEFT JOIN consumer payer ON payer.id = pr.payer_id
          WHERE (
              LOWER(COALESCE(requester.email, pr.requester_email, '')) = LOWER(${contractEmail})
              OR LOWER(COALESCE(payer.email, pr.payer_email, '')) = LOWER(${contractEmail})
            )
        ),
        resource_tags AS (
          SELECT
            rt.resource_id,
            COALESCE(array_agg(DISTINCT dt.name ORDER BY dt.name), ARRAY[]::text[]) AS tags
          FROM resource_tag rt
          JOIN document_tag dt ON dt.id = rt.tag_id
          GROUP BY rt.resource_id
        ),
        contract_docs AS (
          SELECT
            r.id,
            r.original_name AS name,
            r.size,
            COALESCE(r.created_at, MAX(pra.created_at)) AS created_at,
            r.mimetype,
            'PAYMENT'::text AS kind,
            COALESCE(
              array_remove(
                array_agg(DISTINCT CASE WHEN sp.status = 'DRAFT' THEN sp.id::text END),
                NULL
              ),
              ARRAY[]::text[]
            ) AS "attachedDraftPaymentRequestIds",
            COALESCE(
              array_remove(
                array_agg(DISTINCT CASE WHEN sp.status <> 'DRAFT' THEN sp.id::text END),
                NULL
              ),
              ARRAY[]::text[]
            ) AS "attachedNonDraftPaymentRequestIds"
          FROM scoped_payments sp
          JOIN payment_request_attachment pra
            ON pra.payment_request_id = sp.id
           AND pra.deleted_at IS NULL
          JOIN resource r
            ON r.id = pra.resource_id
           AND r.deleted_at IS NULL
          GROUP BY r.id, r.original_name, r.size, r.created_at, r.mimetype
        )
        SELECT
          cd.id,
          cd.name,
          cd.size,
          cd.created_at AS "createdAt",
          cd.mimetype,
          cd.kind,
          COALESCE(rt.tags, ARRAY[]::text[]) AS tags,
          cd."attachedDraftPaymentRequestIds",
          cd."attachedNonDraftPaymentRequestIds",
          COUNT(*) OVER()::int AS "totalCount"
        FROM contract_docs cd
        LEFT JOIN resource_tags rt ON rt.resource_id = cd.id
        ORDER BY cd.created_at DESC, cd.id DESC
        LIMIT ${safePageSize}
        OFFSET ${offset}
      `);

      if (rows.length === 0 && safePage > 1) {
        const countRows = await this.prisma.$queryRaw<Array<{ totalCount: number | bigint }>>(Prisma.sql`
          WITH participant_payment_ids AS (
            ${participantPaymentIdsSql}
          ),
          scoped_payments AS (
            SELECT pr.id
            FROM payment_request pr
            JOIN participant_payment_ids ppi ON ppi.id = pr.id
            LEFT JOIN consumer requester ON requester.id = pr.requester_id
            LEFT JOIN consumer payer ON payer.id = pr.payer_id
            WHERE (
                LOWER(COALESCE(requester.email, pr.requester_email, '')) = LOWER(${contractEmail})
                OR LOWER(COALESCE(payer.email, pr.payer_email, '')) = LOWER(${contractEmail})
              )
          ),
          contract_docs AS (
            SELECT r.id
            FROM scoped_payments sp
            JOIN payment_request_attachment pra
              ON pra.payment_request_id = sp.id
             AND pra.deleted_at IS NULL
            JOIN resource r
              ON r.id = pra.resource_id
             AND r.deleted_at IS NULL
            GROUP BY r.id
          )
          SELECT COUNT(*)::int AS "totalCount"
          FROM contract_docs
        `);

        return {
          items: [],
          total: countRows.length > 0 ? Number(countRows[0].totalCount) : 0,
          page: safePage,
          pageSize: safePageSize,
        };
      }

      const formatted = formatConsumerDocumentRows(rows, backendBaseUrl);
      return { ...formatted, page: safePage, pageSize: safePageSize };
    }

    const kindFilterSql = kindFilter ? Prisma.sql`WHERE doc.kind = ${kindFilter}` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<DocumentListRow[]>(Prisma.sql`
      WITH participant_payment_ids AS (
        ${participantPaymentIdsSql}
      ),
      scoped_payments AS (
        SELECT
          pr.id,
          pr.status
        FROM payment_request pr
        JOIN participant_payment_ids ppi ON ppi.id = pr.id
      ),
      attachment_docs AS (
        SELECT
          r.id,
          r.original_name,
          r.size,
          COALESCE(r.created_at, MAX(pra.created_at)) AS created_at,
          r.mimetype,
          COALESCE(
            array_remove(
              array_agg(DISTINCT CASE WHEN sp.status = 'DRAFT' THEN sp.id::text END),
              NULL
            ),
            ARRAY[]::text[]
          ) AS "attachedDraftPaymentRequestIds",
          COALESCE(
            array_remove(
              array_agg(DISTINCT CASE WHEN sp.status <> 'DRAFT' THEN sp.id::text END),
              NULL
            ),
            ARRAY[]::text[]
          ) AS "attachedNonDraftPaymentRequestIds"
        FROM scoped_payments sp
        JOIN payment_request_attachment pra
          ON pra.payment_request_id = sp.id
         AND pra.deleted_at IS NULL
        JOIN resource r
          ON r.id = pra.resource_id
         AND r.deleted_at IS NULL
        GROUP BY r.id, r.original_name, r.size, r.created_at, r.mimetype
      ),
      consumer_docs AS (
        SELECT
          r.id,
          r.original_name,
          r.size,
          COALESCE(r.created_at, MAX(cr.created_at)) AS created_at,
          r.mimetype
        FROM consumer_resource cr
        JOIN resource r
          ON r.id = cr.resource_id
         AND r.deleted_at IS NULL
        WHERE cr.consumer_id = ${sqlUuid(consumerId)}
          AND cr.deleted_at IS NULL
        GROUP BY r.id, r.original_name, r.size, r.created_at, r.mimetype
      ),
      resource_tags AS (
        SELECT
          rt.resource_id,
          COALESCE(array_agg(DISTINCT dt.name ORDER BY dt.name), ARRAY[]::text[]) AS tags
        FROM resource_tag rt
        JOIN document_tag dt ON dt.id = rt.tag_id
        GROUP BY rt.resource_id
      ),
      combined_docs AS (
        SELECT
          COALESCE(cd.id, ad.id) AS id,
          COALESCE(cd.original_name, ad.original_name) AS name,
          COALESCE(cd.size, ad.size) AS size,
          COALESCE(cd.created_at, ad.created_at) AS created_at,
          COALESCE(cd.mimetype, ad.mimetype) AS mimetype,
          CASE
            WHEN cd.id IS NOT NULL THEN ${buildConsumerDocumentKindSql(Prisma.sql`cd.original_name`)}
            ELSE 'PAYMENT'
          END AS kind,
          COALESCE(rt.tags, ARRAY[]::text[]) AS tags,
          COALESCE(ad."attachedDraftPaymentRequestIds", ARRAY[]::text[]) AS "attachedDraftPaymentRequestIds",
          COALESCE(ad."attachedNonDraftPaymentRequestIds", ARRAY[]::text[]) AS "attachedNonDraftPaymentRequestIds"
        FROM consumer_docs cd
        FULL OUTER JOIN attachment_docs ad ON ad.id = cd.id
        LEFT JOIN resource_tags rt ON rt.resource_id = COALESCE(cd.id, ad.id)
      ),
      filtered_docs AS (
        SELECT *
        FROM combined_docs doc
        ${kindFilterSql}
      )
      SELECT
        doc.id,
        doc.name,
        doc.size,
        doc.created_at AS "createdAt",
        doc.mimetype,
        doc.kind,
        doc.tags,
        doc."attachedDraftPaymentRequestIds",
        doc."attachedNonDraftPaymentRequestIds",
        COUNT(*) OVER()::int AS "totalCount"
      FROM filtered_docs doc
      ORDER BY doc.created_at DESC, doc.id DESC
      LIMIT ${safePageSize}
      OFFSET ${offset}
    `);

    if (rows.length === 0 && safePage > 1) {
      const countRows = await this.prisma.$queryRaw<Array<{ totalCount: number | bigint }>>(Prisma.sql`
        WITH participant_payment_ids AS (
          ${participantPaymentIdsSql}
        ),
        scoped_payments AS (
          SELECT pr.id, pr.status
          FROM payment_request pr
          JOIN participant_payment_ids ppi ON ppi.id = pr.id
        ),
        attachment_docs AS (
          SELECT
            r.id,
            r.original_name
          FROM scoped_payments sp
          JOIN payment_request_attachment pra
            ON pra.payment_request_id = sp.id
           AND pra.deleted_at IS NULL
          JOIN resource r
            ON r.id = pra.resource_id
           AND r.deleted_at IS NULL
          GROUP BY r.id, r.original_name
        ),
        consumer_docs AS (
          SELECT
            r.id,
            r.original_name
          FROM consumer_resource cr
          JOIN resource r
            ON r.id = cr.resource_id
           AND r.deleted_at IS NULL
          WHERE cr.consumer_id = ${sqlUuid(consumerId)}
            AND cr.deleted_at IS NULL
          GROUP BY r.id, r.original_name
        ),
        combined_docs AS (
          SELECT
            COALESCE(cd.id, ad.id) AS id,
            CASE
              WHEN cd.id IS NOT NULL THEN ${buildConsumerDocumentKindSql(Prisma.sql`cd.original_name`)}
              ELSE 'PAYMENT'
            END AS kind
          FROM consumer_docs cd
          FULL OUTER JOIN attachment_docs ad ON ad.id = cd.id
        )
        SELECT COUNT(*)::int AS "totalCount"
        FROM combined_docs doc
        ${kindFilterSql}
      `);

      return {
        items: [],
        total: countRows.length > 0 ? Number(countRows[0].totalCount) : 0,
        page: safePage,
        pageSize: safePageSize,
      };
    }

    const formatted = formatConsumerDocumentRows(rows, backendBaseUrl);
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
