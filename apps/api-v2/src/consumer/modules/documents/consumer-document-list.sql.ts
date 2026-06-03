import { Prisma } from '@remoola/database-2';

import {
  buildConsumerDocumentKindSql,
  buildConsumerDocumentPaymentParticipantIdsSql,
} from './consumer-document-query-helpers';
import { sqlUuid } from '../../../shared/prisma-raw.utils';

type ConsumerDocumentListSqlParams = {
  consumerId: string;
  consumerEmail: string | null;
  safePage: number;
  safePageSize: number;
  kindFilter: string | null;
};

type ContractScopedConsumerDocumentListSqlParams = ConsumerDocumentListSqlParams & {
  contractEmail: string;
};

function getConsumerDocumentListOffset(safePage: number, safePageSize: number) {
  return (safePage - 1) * safePageSize;
}

function buildConsumerDocumentListKindFilterSql(kindFilter: string | null) {
  return kindFilter ? Prisma.sql`WHERE doc.kind = ${kindFilter}` : Prisma.empty;
}

export function buildContractScopedConsumerDocumentListRowsSql({
  consumerId,
  consumerEmail,
  safePage,
  safePageSize,
  contractEmail,
}: ContractScopedConsumerDocumentListSqlParams) {
  const offset = getConsumerDocumentListOffset(safePage, safePageSize);
  const participantPaymentIdsSql = buildConsumerDocumentPaymentParticipantIdsSql(consumerId, consumerEmail);

  return Prisma.sql`
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
  `;
}

export function buildContractScopedConsumerDocumentListCountSql({
  consumerId,
  consumerEmail,
  contractEmail,
}: ContractScopedConsumerDocumentListSqlParams) {
  const participantPaymentIdsSql = buildConsumerDocumentPaymentParticipantIdsSql(consumerId, consumerEmail);

  return Prisma.sql`
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
  `;
}

export function buildGeneralConsumerDocumentListRowsSql({
  consumerId,
  consumerEmail,
  safePage,
  safePageSize,
  kindFilter,
}: ConsumerDocumentListSqlParams) {
  const offset = getConsumerDocumentListOffset(safePage, safePageSize);
  const participantPaymentIdsSql = buildConsumerDocumentPaymentParticipantIdsSql(consumerId, consumerEmail);
  const kindFilterSql = buildConsumerDocumentListKindFilterSql(kindFilter);

  return Prisma.sql`
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
  `;
}

export function buildGeneralConsumerDocumentListCountSql({
  consumerId,
  consumerEmail,
  kindFilter,
}: ConsumerDocumentListSqlParams) {
  const participantPaymentIdsSql = buildConsumerDocumentPaymentParticipantIdsSql(consumerId, consumerEmail);
  const kindFilterSql = buildConsumerDocumentListKindFilterSql(kindFilter);

  return Prisma.sql`
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
  `;
}
