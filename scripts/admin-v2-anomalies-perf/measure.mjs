#!/usr/bin/env node
// Perf measurement runner for admin-v2 ledger anomaly queries.
// Runs the EXACT SQL shape used by AdminV2LedgerAnomaliesService (1:1 copy
// kept in sync with apps/api-v2/src/admin-v2/ledger/anomalies/admin-v2-ledger-anomalies.service.ts).
// Captures p50/p95/p99/mean per shape + EXPLAIN (ANALYZE, BUFFERS) for one run.

/* eslint-disable no-console */

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const require = createRequire(import.meta.url);
const { PrismaClient, Prisma } = require('@remoola/database-2');

const prisma = new PrismaClient();

const PENDING_OUTCOME_STATUSES = ['WAITING', 'WAITING_RECIPIENT_APPROVAL', 'PENDING'];

const LARGE_VALUE_THRESHOLDS = {
  USD: 10_000,
  EUR: 10_000,
  GBP: 10_000,
  CHF: 10_000,
  CAD: 14_000,
  AUD: 15_000,
  NZD: 16_500,
  SGD: 13_500,
  HKD: 78_000,
  JPY: 1_500_000,
  CNY: 70_000,
};
const LARGE_VALUE_THRESHOLD_ENTRIES = Object.entries(LARGE_VALUE_THRESHOLDS);

const STALE_PENDING_HOURS = 24;
const INCONSISTENT_CHAIN_GRACE_MINUTES = 60;
const SUMMARY_OUTLIER_WINDOW_DAYS = 30;
const LIST_RANGE_DAYS = 30;
const LIST_LIMIT = 50;
const DEFAULT_RUNS = 100;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function buildLargeValueThresholdSql() {
  return Prisma.join(
    LARGE_VALUE_THRESHOLD_ENTRIES.map(
      ([currencyCode, threshold]) =>
        Prisma.sql`(le.currency_code::text = ${currencyCode} AND ABS(le.amount) >= ${threshold})`,
    ),
    ' OR ',
  );
}

function pendingStatusJoin() {
  return Prisma.join(PENDING_OUTCOME_STATUSES.map((status) => Prisma.sql`${status}`));
}

function buildStalePendingCountSql(now) {
  const cutoff = new Date(now.getTime() - STALE_PENDING_HOURS * 60 * 60 * 1000);
  return Prisma.sql`
    SELECT COUNT(*)::int AS "count"
    FROM ledger_entry le
    JOIN LATERAL (
      SELECT o.status, o.created_at
      FROM ledger_entry_outcome o
      WHERE o.ledger_entry_id = le.id
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT 1
    ) latest ON true
    WHERE le.deleted_at IS NULL
      AND latest.status::text IN (${pendingStatusJoin()})
      AND latest.created_at < ${cutoff}
  `;
}

function buildInconsistentChainCountSql(now) {
  const cutoff = new Date(now.getTime() - INCONSISTENT_CHAIN_GRACE_MINUTES * 60 * 1000);
  return Prisma.sql`
    SELECT COUNT(*)::int AS "count"
    FROM ledger_entry le
    JOIN LATERAL (
      SELECT o.status, o.created_at
      FROM ledger_entry_outcome o
      WHERE o.ledger_entry_id = le.id
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT 1
    ) latest ON true
    WHERE le.deleted_at IS NULL
      AND le.status <> latest.status
      AND latest.created_at < ${cutoff}
  `;
}

function buildLargeValueCountSql(now) {
  const windowStart = new Date(now.getTime() - SUMMARY_OUTLIER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return Prisma.sql`
    SELECT COUNT(*)::int AS "count"
    FROM ledger_entry le
    WHERE le.deleted_at IS NULL
      AND le.created_at >= ${windowStart}
      AND le.created_at <= ${now}
      AND (${buildLargeValueThresholdSql()})
  `;
}

function buildStalePendingListSql(now) {
  const cutoff = new Date(now.getTime() - STALE_PENDING_HOURS * 60 * 60 * 1000);
  const dateFrom = new Date(now.getTime() - LIST_RANGE_DAYS * 24 * 60 * 60 * 1000);
  return Prisma.sql`
    SELECT
      le.id AS "id",
      le.id AS "ledgerEntryId",
      le.consumer_id AS "consumerId",
      le.type::text AS "type",
      le.amount AS "amount",
      le.currency_code::text AS "currencyCode",
      le.status::text AS "entryStatus",
      latest.status::text AS "outcomeStatus",
      latest.created_at AS "outcomeAt",
      le.created_at AS "createdAt",
      le.updated_at AS "updatedAt",
      latest.created_at AS "anomalyAt",
      NULL::int AS "threshold"
    FROM ledger_entry le
    JOIN LATERAL (
      SELECT o.status, o.created_at
      FROM ledger_entry_outcome o
      WHERE o.ledger_entry_id = le.id
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT 1
    ) latest ON true
    WHERE le.deleted_at IS NULL
      AND latest.status::text IN (${pendingStatusJoin()})
      AND latest.created_at < ${cutoff}
      AND latest.created_at >= ${dateFrom}
      AND latest.created_at <= ${now}
    ORDER BY latest.created_at DESC, le.id DESC
    LIMIT ${LIST_LIMIT + 1}
  `;
}

function buildInconsistentChainListSql(now) {
  const cutoff = new Date(now.getTime() - INCONSISTENT_CHAIN_GRACE_MINUTES * 60 * 1000);
  const dateFrom = new Date(now.getTime() - LIST_RANGE_DAYS * 24 * 60 * 60 * 1000);
  return Prisma.sql`
    SELECT
      le.id AS "id",
      le.id AS "ledgerEntryId",
      le.consumer_id AS "consumerId",
      le.type::text AS "type",
      le.amount AS "amount",
      le.currency_code::text AS "currencyCode",
      le.status::text AS "entryStatus",
      latest.status::text AS "outcomeStatus",
      latest.created_at AS "outcomeAt",
      le.created_at AS "createdAt",
      le.updated_at AS "updatedAt",
      latest.created_at AS "anomalyAt",
      NULL::int AS "threshold"
    FROM ledger_entry le
    JOIN LATERAL (
      SELECT o.status, o.created_at
      FROM ledger_entry_outcome o
      WHERE o.ledger_entry_id = le.id
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT 1
    ) latest ON true
    WHERE le.deleted_at IS NULL
      AND le.status <> latest.status
      AND latest.created_at < ${cutoff}
      AND latest.created_at >= ${dateFrom}
      AND latest.created_at <= ${now}
    ORDER BY latest.created_at DESC, le.id DESC
    LIMIT ${LIST_LIMIT + 1}
  `;
}

function buildLargeValueListSql(now) {
  const dateFrom = new Date(now.getTime() - LIST_RANGE_DAYS * 24 * 60 * 60 * 1000);
  return Prisma.sql`
    SELECT
      le.id AS "id",
      le.id AS "ledgerEntryId",
      le.consumer_id AS "consumerId",
      le.type::text AS "type",
      le.amount AS "amount",
      le.currency_code::text AS "currencyCode",
      le.status::text AS "entryStatus",
      NULL::text AS "outcomeStatus",
      NULL::timestamptz AS "outcomeAt",
      le.created_at AS "createdAt",
      le.updated_at AS "updatedAt",
      le.created_at AS "anomalyAt",
      thresholds.threshold AS "threshold"
    FROM ledger_entry le
    JOIN LATERAL (
      SELECT threshold
      FROM (
        VALUES ${Prisma.join(
          LARGE_VALUE_THRESHOLD_ENTRIES.map(
            ([currencyCode, threshold]) => Prisma.sql`(${currencyCode}, ${threshold})`,
          ),
          ', ',
        )}
      ) AS threshold_map(currency_code, threshold)
      WHERE threshold_map.currency_code = le.currency_code::text
    ) thresholds ON true
    WHERE le.deleted_at IS NULL
      AND le.created_at >= ${dateFrom}
      AND le.created_at <= ${now}
      AND ABS(le.amount) >= thresholds.threshold
    ORDER BY le.created_at DESC, le.id DESC
    LIMIT ${LIST_LIMIT + 1}
  `;
}

function summarize(samples) {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const mean = sum / sorted.length;
  const pick = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  return {
    runs: sorted.length,
    minMs: round(sorted[0]),
    maxMs: round(sorted[sorted.length - 1]),
    meanMs: round(mean),
    p50Ms: round(pick(0.5)),
    p95Ms: round(pick(0.95)),
    p99Ms: round(pick(0.99)),
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

async function timeQuery(buildSql) {
  const sql = buildSql(new Date());
  const start = process.hrtime.bigint();
  await prisma.$queryRaw(sql);
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6;
}

async function timeSummary() {
  const now = new Date();
  const start = process.hrtime.bigint();
  await Promise.all([
    prisma.$queryRaw(buildStalePendingCountSql(now)),
    prisma.$queryRaw(buildInconsistentChainCountSql(now)),
    prisma.$queryRaw(buildLargeValueCountSql(now)),
  ]);
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6;
}

async function timeSummarySequential() {
  const now = new Date();
  const start = process.hrtime.bigint();
  await prisma.$queryRaw(buildStalePendingCountSql(now));
  await prisma.$queryRaw(buildInconsistentChainCountSql(now));
  await prisma.$queryRaw(buildLargeValueCountSql(now));
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6;
}

async function explainQuery(buildSql) {
  const sql = buildSql(new Date());
  const wrapped = Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`;
  const rows = await prisma.$queryRaw(wrapped);
  return rows.map((row) => row['QUERY PLAN']).join('\n');
}

async function runShape(label, runner, runs) {
  console.log(`[measure] ${label}: warmup...`);
  await runner();
  await runner();
  console.log(`[measure] ${label}: running ${runs} iterations`);
  const samples = [];
  for (let i = 0; i < runs; i += 1) {
    const ms = await runner();
    samples.push(ms);
    if ((i + 1) % 25 === 0) {
      console.log(`[measure]   ${label}: ${i + 1}/${runs}`);
    }
  }
  const stats = summarize(samples);
  console.log(`[measure] ${label}:`, stats);
  return stats;
}

async function rowCounts() {
  const [entries, outcomes, perfEntries] = await Promise.all([
    prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM ledger_entry`,
    prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM ledger_entry_outcome`,
    prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM ledger_entry WHERE metadata->>'perf_anomaly' = 'true'`,
  ]);
  return {
    ledgerEntryRows: entries[0]?.count ?? 0,
    ledgerEntryOutcomeRows: outcomes[0]?.count ?? 0,
    perfEntryRows: perfEntries[0]?.count ?? 0,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const runs = Number.parseInt(process.argv[2] ?? `${DEFAULT_RUNS}`, 10) || DEFAULT_RUNS;
  console.log(`[measure] runs per shape: ${runs}`);

  const counts = await rowCounts();
  console.log('[measure] row counts:', counts);

  const shapes = [
    { label: 'countStalePendingEntries', run: () => timeQuery(buildStalePendingCountSql) },
    { label: 'countInconsistentOutcomeChains', run: () => timeQuery(buildInconsistentChainCountSql) },
    { label: 'countLargeValueOutliers', run: () => timeQuery(buildLargeValueCountSql) },
    { label: 'summaryEndpoint:promiseAll', run: () => timeSummary() },
    { label: 'summaryEndpoint:sequential', run: () => timeSummarySequential() },
    { label: 'listStalePendingEntries', run: () => timeQuery(buildStalePendingListSql) },
    { label: 'listInconsistentOutcomeChains', run: () => timeQuery(buildInconsistentChainListSql) },
    { label: 'listLargeValueOutliers', run: () => timeQuery(buildLargeValueListSql) },
  ];

  const stats = {};
  for (const shape of shapes) {
    stats[shape.label] = await runShape(shape.label, shape.run, runs);
  }

  console.log('[measure] capturing EXPLAIN (ANALYZE, BUFFERS)...');
  const explainShapes = [
    ['countStalePendingEntries', buildStalePendingCountSql],
    ['countInconsistentOutcomeChains', buildInconsistentChainCountSql],
    ['countLargeValueOutliers', buildLargeValueCountSql],
    ['listStalePendingEntries', buildStalePendingListSql],
    ['listInconsistentOutcomeChains', buildInconsistentChainListSql],
    ['listLargeValueOutliers', buildLargeValueListSql],
  ];
  const explains = {};
  for (const [label, builder] of explainShapes) {
    try {
      explains[label] = await explainQuery(builder);
    } catch (error) {
      explains[label] = `EXPLAIN failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  const result = {
    capturedAt: new Date().toISOString(),
    rowCounts: counts,
    runsPerShape: runs,
    stats,
    explains,
  };

  const outDir = resolve(__dirname, 'output');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `measure-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`[measure] wrote ${outPath}`);

  console.log('\n=== Summary ===');
  for (const [label, value] of Object.entries(stats)) {
    console.log(`  ${label}: p50=${value.p50Ms}ms p95=${value.p95Ms}ms p99=${value.p99Ms}ms mean=${value.meanMs}ms`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('[measure] failed:', error);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
