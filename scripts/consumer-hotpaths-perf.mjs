#!/usr/bin/env node
// Manual perf harness for consumer contracts + payments hot paths.
// Seeds a synthetic dataset, runs EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
// for the current raw SQL shapes, prints a compact summary, and cleans up.
// This script is intentionally not wired into CI.

/* eslint-disable no-console */

import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@remoola/database-2');

const prisma = new PrismaClient();

const CONTACTS = Number(process.env.PERF_CONTACTS ?? 1500);
const PAYMENTS = Number(process.env.PERF_PAYMENTS ?? 12000);
const ENTRIES_PER_PAYMENT = Number(process.env.PERF_ENTRIES_PER_PAYMENT ?? 10);
const PAGE_SIZE = Number(process.env.PERF_PAGE_SIZE ?? 20);
const ATTACHMENT_EVERY = Number(process.env.PERF_ATTACHMENT_EVERY ?? 20);

const tag = `perf-hotpath-${Date.now()}`;
const ownerEmail = `${tag}@local.test`;

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function ts(baseMs, offsetMs) {
  return new Date(baseMs + offsetMs);
}

function normalize(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, candidate) => (typeof candidate === `bigint` ? candidate.toString() : candidate)),
  );
}

async function createManyInChunks(model, rows, size = 1000) {
  for (const piece of chunk(rows, size)) {
    await model.createMany({ data: piece });
  }
}

async function analyzeTables() {
  for (const table of [
    `consumer`,
    `contact`,
    `payment_request`,
    `ledger_entry`,
    `ledger_entry_outcome`,
    `resource`,
    `payment_request_attachment`,
  ]) {
    await prisma.$executeRawUnsafe(`ANALYZE ${table}`);
  }
}

async function explain(label, sql) {
  const rows = await prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
  const plan = rows[0][`QUERY PLAN`][0];
  const planText = JSON.stringify(plan);
  return {
    label,
    executionMs: Number(plan[`Execution Time`].toFixed(3)),
    planningMs: Number(plan[`Planning Time`].toFixed(3)),
    rootNode: plan.Plan[`Node Type`],
    usesPaymentLatestIndex: planText.includes(`idx_ledger_entry_payment_request_consumer_latest`),
    usesHistoryLatestIndex: planText.includes(`idx_ledger_entry_consumer_ledger_latest`),
  };
}

function buildContractsSql(ownerId) {
  return `
    WITH participant_payment_ids AS (
      SELECT pr.id
      FROM payment_request pr
      WHERE pr.deleted_at IS NULL
        AND pr.requester_id = '${ownerId}'::uuid
    ),
    filtered_contacts AS (
      SELECT
        c.id,
        COALESCE(c.name, c.email) AS name,
        c.email,
        c.updated_at
      FROM contact c
      WHERE c.consumer_id = '${ownerId}'::uuid
        AND c.deleted_at IS NULL
    ),
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
          AND le.consumer_id = '${ownerId}'::uuid
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
      SELECT payment_id, updated_at, created_at, effective_status, requester_email AS counterparty_email
      FROM participant_payments_base
      WHERE requester_email <> ''
      UNION
      SELECT payment_id, updated_at, created_at, effective_status, payer_email AS counterparty_email
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
    ORDER BY
      COALESCE(rc.last_activity, rc.contact_updated_at) DESC,
      LOWER(rc.name) ASC,
      rc.id ASC
    LIMIT ${PAGE_SIZE}
    OFFSET 0
  `;
}

function buildPaymentsStatusCountSql(ownerId) {
  return `
    WITH participant_payment_ids AS (
      SELECT pr.id
      FROM payment_request pr
      WHERE pr.deleted_at IS NULL
        AND pr.requester_id = '${ownerId}'::uuid
    ),
    filtered AS (
      SELECT pr.id, pr.created_at
      FROM participant_payment_ids ppi
      JOIN payment_request pr ON pr.id = ppi.id
      LEFT JOIN consumer requester ON requester.id = pr.requester_id
      LEFT JOIN consumer payer ON payer.id = pr.payer_id
      LEFT JOIN LATERAL (
        SELECT le.id, le.status
        FROM ledger_entry le
        WHERE le.payment_request_id = pr.id
          AND le.consumer_id = '${ownerId}'::uuid
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
      WHERE COALESCE(latest_outcome.status::text, latest_le.status::text, pr.status::text) IN ('PENDING', 'WAITING')
    )
    SELECT COUNT(*)::int AS total
    FROM filtered
  `;
}

function buildPaymentsStatusPageSql(ownerId) {
  return `
    WITH participant_payment_ids AS (
      SELECT pr.id
      FROM payment_request pr
      WHERE pr.deleted_at IS NULL
        AND pr.requester_id = '${ownerId}'::uuid
    ),
    filtered AS (
      SELECT pr.id, pr.created_at
      FROM participant_payment_ids ppi
      JOIN payment_request pr ON pr.id = ppi.id
      LEFT JOIN consumer requester ON requester.id = pr.requester_id
      LEFT JOIN consumer payer ON payer.id = pr.payer_id
      LEFT JOIN LATERAL (
        SELECT le.id, le.status
        FROM ledger_entry le
        WHERE le.payment_request_id = pr.id
          AND le.consumer_id = '${ownerId}'::uuid
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
      WHERE COALESCE(latest_outcome.status::text, latest_le.status::text, pr.status::text) IN ('PENDING', 'WAITING')
    )
    SELECT id
    FROM filtered
    ORDER BY created_at DESC, id DESC
    OFFSET 0
    LIMIT ${PAGE_SIZE}
  `;
}

function buildPaymentsHistoryNoStatusSql(ownerId) {
  return `
    WITH latest_entry_ids AS (
      SELECT DISTINCT ON (le.ledger_id) le.id
      FROM ledger_entry le
      WHERE le.consumer_id = '${ownerId}'::uuid
        AND le.deleted_at IS NULL
      ORDER BY le.ledger_id, le.created_at DESC, le.id DESC
    ),
    latest_entries AS (
      SELECT
        le.id,
        le.ledger_id AS "ledgerId",
        le.type,
        CASE
          WHEN le.payment_request_id IS NOT NULL AND le.type::text = 'USER_DEPOSIT'
            THEN 'USER_PAYMENT'::text
          WHEN le.payment_request_id IS NOT NULL AND le.type::text = 'USER_DEPOSIT_REVERSAL'
            THEN 'USER_PAYMENT_REVERSAL'::text
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
    ),
    paged AS (
      SELECT
        latest.*,
        COUNT(*) OVER()::int AS "totalRows"
      FROM filtered latest
      ORDER BY latest."createdAt" DESC, latest.id DESC
      OFFSET 0
      LIMIT ${PAGE_SIZE}
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
  `;
}

function buildPaymentsHistoryStatusSql(ownerId) {
  return `
    WITH latest_entry_ids AS (
      SELECT DISTINCT ON (le.ledger_id) le.id
      FROM ledger_entry le
      WHERE le.consumer_id = '${ownerId}'::uuid
        AND le.deleted_at IS NULL
      ORDER BY le.ledger_id, le.created_at DESC, le.id DESC
    ),
    latest_entries AS (
      SELECT
        le.id,
        le.ledger_id AS "ledgerId",
        le.type,
        CASE
          WHEN le.payment_request_id IS NOT NULL AND le.type::text = 'USER_DEPOSIT'
            THEN 'USER_PAYMENT'::text
          WHEN le.payment_request_id IS NOT NULL AND le.type::text = 'USER_DEPOSIT_REVERSAL'
            THEN 'USER_PAYMENT_REVERSAL'::text
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
      WHERE latest."effectiveStatus" IN ('PENDING', 'WAITING')
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
    OFFSET 0
    LIMIT ${PAGE_SIZE}
  `;
}

async function seed() {
  const baseMs = Date.parse(`2026-05-12T12:00:00.000Z`);
  const ownerId = randomUUID();

  await prisma.consumerModel.create({
    data: {
      id: ownerId,
      email: ownerEmail,
      accountType: `CONTRACTOR`,
      contractorKind: `INDIVIDUAL`,
    },
  });

  const contacts = Array.from({ length: CONTACTS }, (_, index) => ({
    id: randomUUID(),
    consumerId: ownerId,
    email: `${tag}-contact-${index}@local.test`,
    name: `Perf Contact ${index}`,
    address: { country: `US` },
    createdAt: ts(baseMs, index * 10),
    updatedAt: ts(baseMs, index * 10),
  }));
  await createManyInChunks(prisma.contactModel, contacts);

  const payments = Array.from({ length: PAYMENTS }, (_, index) => {
    const contact = contacts[index % contacts.length];
    const status = index % 3 === 0 ? `COMPLETED` : index % 3 === 1 ? `PENDING` : `WAITING`;
    const createdAt = ts(baseMs, 1000 + index * 1000);
    return {
      id: randomUUID(),
      amount: 10 + (index % 17),
      currencyCode: `USD`,
      status,
      type: `BANK_TRANSFER`,
      paymentRail: `BANK_TRANSFER`,
      requesterId: ownerId,
      payerEmail: contact.email,
      description: `${tag}-payment-${index}`,
      createdAt,
      updatedAt: createdAt,
    };
  });
  await createManyInChunks(prisma.paymentRequestModel, payments);

  const entries = [];
  const outcomes = [];
  for (const [paymentIndex, payment] of payments.entries()) {
    const ledgerId = payment.id;
    for (let entryIndex = 0; entryIndex < ENTRIES_PER_PAYMENT; entryIndex += 1) {
      const createdAt = ts(payment.createdAt.getTime(), entryIndex * 1000);
      const isLatest = entryIndex === ENTRIES_PER_PAYMENT - 1;
      const status =
        paymentIndex % 3 === 0 ? `COMPLETED` : paymentIndex % 3 === 1 ? `PENDING` : isLatest ? `WAITING` : `PENDING`;
      const type = isLatest && paymentIndex % 5 === 0 ? `USER_DEPOSIT` : `USER_PAYMENT`;
      const entry = {
        id: randomUUID(),
        ledgerId,
        consumerId: ownerId,
        paymentRequestId: payment.id,
        type,
        currencyCode: `USD`,
        status,
        amount: type === `USER_DEPOSIT` ? payment.amount : -payment.amount,
        metadata: { perf_hotpath: true, tag },
        createdAt,
        updatedAt: createdAt,
      };
      entries.push(entry);
      if (isLatest && paymentIndex % 4 !== 0) {
        outcomes.push({
          id: randomUUID(),
          ledgerEntryId: entry.id,
          status: paymentIndex % 4 === 1 ? `WAITING_RECIPIENT_APPROVAL` : status,
          source: `consumer-hotpaths-perf`,
          externalId: `${tag}-outcome-${paymentIndex}`,
          createdAt: ts(createdAt.getTime(), 1),
        });
      }
    }
  }
  await createManyInChunks(prisma.ledgerEntryModel, entries);
  await createManyInChunks(prisma.ledgerEntryOutcomeModel, outcomes);

  const attachmentTargets = payments.filter((_payment, index) => index % ATTACHMENT_EVERY === 0);
  const resources = attachmentTargets.map((payment, index) => ({
    id: randomUUID(),
    access: `PRIVATE`,
    originalName: `perf-contract-${index}.pdf`,
    mimetype: `application/pdf`,
    size: 128,
    bucket: `local`,
    key: `${tag}/resource-${index}.pdf`,
    downloadUrl: `legacy://${tag}/resource-${index}`,
    createdAt: payment.createdAt,
    updatedAt: payment.createdAt,
  }));
  if (resources.length > 0) {
    await createManyInChunks(prisma.resourceModel, resources);
    await createManyInChunks(
      prisma.paymentRequestAttachmentModel,
      resources.map((resource, index) => ({
        paymentRequestId: attachmentTargets[index].id,
        requesterId: ownerId,
        resourceId: resource.id,
        createdAt: attachmentTargets[index].createdAt,
        updatedAt: attachmentTargets[index].createdAt,
      })),
    );
  }

  await analyzeTables();
  return { ownerId };
}

async function cleanup() {
  await prisma.paymentRequestAttachmentModel.deleteMany({
    where: {
      paymentRequest: {
        description: {
          startsWith: `${tag}-payment-`,
        },
      },
    },
  });
  await prisma.resourceModel.deleteMany({
    where: {
      key: {
        startsWith: `${tag}/`,
      },
    },
  });
  await prisma.paymentRequestModel.deleteMany({
    where: {
      description: {
        startsWith: `${tag}-payment-`,
      },
    },
  });
  await prisma.consumerModel.deleteMany({
    where: {
      email: ownerEmail,
    },
  });
}

async function main() {
  console.log(
    JSON.stringify({
      phase: `seed_start`,
      tag,
      contacts: CONTACTS,
      payments: PAYMENTS,
      entriesPerPayment: ENTRIES_PER_PAYMENT,
      pageSize: PAGE_SIZE,
    }),
  );

  const { ownerId } = await seed();
  console.log(JSON.stringify({ phase: `seed_done`, ownerId }));

  const summaries = [
    await explain(`contracts_list`, buildContractsSql(ownerId)),
    await explain(`payments_status_count`, buildPaymentsStatusCountSql(ownerId)),
    await explain(`payments_status_page`, buildPaymentsStatusPageSql(ownerId)),
    await explain(`payments_history_no_status`, buildPaymentsHistoryNoStatusSql(ownerId)),
    await explain(`payments_history_status_filter`, buildPaymentsHistoryStatusSql(ownerId)),
  ];

  for (const summary of summaries) {
    console.log(JSON.stringify(normalize(summary)));
  }
}

try {
  await main();
} finally {
  console.log(JSON.stringify({ phase: `cleanup_start`, tag }));
  await cleanup();
  await prisma.$disconnect();
  console.log(JSON.stringify({ phase: `cleanup_done`, tag }));
}
