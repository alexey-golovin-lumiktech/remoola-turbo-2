#!/usr/bin/env node
// Synthetic dataset generator for admin-v2 ledger anomaly perf measurement.
// NOT meant for the production seed pipeline. Uses the `perf-anomaly-` email
// namespace + ledger_entry.metadata->>'perf_anomaly' = 'true' for safe cleanup.
// See README.md in this folder for usage.

/* eslint-disable no-console */

import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const { PrismaClient, Prisma } = require('@remoola/database-2');

const prisma = new PrismaClient();

const PERF_EMAIL_PREFIX = 'perf-anomaly-';
const PERF_EMAIL_DOMAIN = '@remoola.test';
const PERF_METADATA_FLAG = 'perf_anomaly';

const DEFAULT_CONSUMERS = 5_000;
const DEFAULT_ENTRIES = 50_000;
const ENTRY_INSERT_CHUNK = 1_000;
const OUTCOME_INSERT_CHUNK = 2_000;
const CONSUMER_INSERT_CHUNK = 1_000;

const TRACKED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD', 'JPY', 'CNY'];
const UNTRACKED_CURRENCIES = ['RUB', 'UAH', 'BRL', 'INR', 'TRY', 'ZAR'];
const LEDGER_ENTRY_TYPES = [
  'USER_PAYMENT',
  'USER_DEPOSIT',
  'USER_PAYOUT',
  'PLATFORM_FEE',
  'CURRENCY_EXCHANGE',
  'USER_PAYMENT_REVERSAL',
];

const PENDING_STATUSES = ['PENDING', 'WAITING', 'WAITING_RECIPIENT_APPROVAL'];
const TERMINAL_STATUSES = ['COMPLETED', 'DENIED', 'UNCOLLECTIBLE'];

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

const STALE_HOURS = 24;
const INCONSISTENT_CHAIN_GRACE_MINUTES = 60;

const STALE_PENDING_TARGET = 200;
const INCONSISTENT_CHAIN_TARGET = 100;
const LARGE_VALUE_TARGET = 300;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, maxInclusive) {
  return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function randomCreatedWithinDays(days) {
  const now = Date.now();
  const offsetMs = Math.random() * days * 24 * 60 * 60 * 1000;
  return new Date(now - offsetMs);
}

function randomNormalAmount(currency) {
  const base = Math.exp(Math.random() * 6) + 1;
  const ceiling = (LARGE_VALUE_THRESHOLDS[currency] ?? 10_000) * 0.7;
  const value = Math.min(base * 10, ceiling);
  const sign = Math.random() < 0.85 ? 1 : -1;
  return Number((sign * value).toFixed(2));
}

function randomLargeAmount(currency) {
  const threshold = LARGE_VALUE_THRESHOLDS[currency] ?? 10_000;
  const multiplier = 1.05 + Math.random() * 4;
  const sign = Math.random() < 0.7 ? 1 : -1;
  return Number((sign * threshold * multiplier).toFixed(2));
}

async function ensureConsumers(target) {
  const existing = await prisma.consumerModel.findMany({
    where: { email: { startsWith: PERF_EMAIL_PREFIX } },
    select: { id: true },
  });
  console.log(`[seed] existing perf consumers: ${existing.length}`);
  if (existing.length >= target) {
    return existing.slice(0, target).map((row) => row.id);
  }
  const need = target - existing.length;
  console.log(`[seed] inserting ${need} new consumers...`);
  for (let offset = existing.length; offset < target; offset += CONSUMER_INSERT_CHUNK) {
    const batch = [];
    const upperBound = Math.min(target, offset + CONSUMER_INSERT_CHUNK);
    for (let i = offset; i < upperBound; i += 1) {
      batch.push({
        id: randomUUID(),
        email: `${PERF_EMAIL_PREFIX}${i}-${randomUUID().slice(0, 8)}${PERF_EMAIL_DOMAIN}`,
        accountType: 'BUSINESS',
      });
    }
    await prisma.consumerModel.createMany({ data: batch, skipDuplicates: true });
    console.log(`[seed]   consumers progress: ${upperBound}/${target}`);
  }
  const allConsumers = await prisma.consumerModel.findMany({
    where: { email: { startsWith: PERF_EMAIL_PREFIX } },
    select: { id: true },
  });
  return allConsumers.slice(0, target).map((row) => row.id);
}

async function countExistingPerfEntries() {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM ledger_entry
    WHERE metadata ->> ${PERF_METADATA_FLAG} = 'true'
  `;
  return rows[0]?.count ?? 0;
}

function buildEntryRow(consumerId, options = {}) {
  const id = randomUUID();
  const ledgerId = randomUUID();
  const type = options.type ?? pickRandom(LEDGER_ENTRY_TYPES);
  const currencyCode = options.currencyCode ?? pickRandom([...TRACKED_CURRENCIES, ...UNTRACKED_CURRENCIES]);
  const status = options.status ?? pickRandom([...PENDING_STATUSES, ...TERMINAL_STATUSES]);
  const amount = options.amount ?? randomNormalAmount(currencyCode);
  const createdAt = options.createdAt ?? randomCreatedWithinDays(60);
  return { id, ledgerId, type, currencyCode, status, amount, createdAt, consumerId };
}

function buildOutcomeChain(entry, options = {}) {
  const outcomes = [];
  const finalStatus = options.finalOutcomeStatus ?? entry.status;
  const finalCreatedAt = options.finalOutcomeCreatedAt ?? entry.createdAt;
  const intermediateCount = options.intermediateCount ?? randomInt(0, 3);
  for (let i = 0; i < intermediateCount; i += 1) {
    const stepStatus = pickRandom([...PENDING_STATUSES, 'DRAFT']);
    const stepCreatedAt = new Date(entry.createdAt.getTime() + i * 1000);
    outcomes.push({
      id: randomUUID(),
      ledgerEntryId: entry.id,
      status: stepStatus,
      createdAt: stepCreatedAt,
    });
  }
  outcomes.push({
    id: randomUUID(),
    ledgerEntryId: entry.id,
    status: finalStatus,
    createdAt: finalCreatedAt,
  });
  return outcomes;
}

async function insertEntries(entries) {
  for (const piece of chunk(entries, ENTRY_INSERT_CHUNK)) {
    const values = piece.map(
      (entry) => Prisma.sql`(
        ${entry.id}::uuid,
        ${entry.ledgerId}::uuid,
        ${entry.type}::ledger_entry_type_enum,
        ${entry.currencyCode}::currency_code_enum,
        ${entry.status}::transaction_status_enum,
        ${entry.amount}::decimal(9,2),
        ${entry.consumerId}::uuid,
        ${entry.createdAt}::timestamptz,
        ${entry.createdAt}::timestamptz,
        ${JSON.stringify({ [PERF_METADATA_FLAG]: true })}::jsonb
      )`,
    );
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO ledger_entry
        (id, ledger_id, type, currency_code, status, amount, consumer_id, created_at, updated_at, metadata)
      VALUES ${Prisma.join(values)}
    `);
  }
}

async function insertOutcomes(outcomes) {
  for (const piece of chunk(outcomes, OUTCOME_INSERT_CHUNK)) {
    const values = piece.map(
      (outcome) => Prisma.sql`(
        ${outcome.id}::uuid,
        ${outcome.ledgerEntryId}::uuid,
        ${outcome.status}::transaction_status_enum,
        ${outcome.createdAt}::timestamptz
      )`,
    );
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO ledger_entry_outcome (id, ledger_entry_id, status, created_at)
      VALUES ${Prisma.join(values)}
    `);
  }
}

function buildBaselineEntries(consumerIds, count) {
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    const consumerId = pickRandom(consumerIds);
    entries.push(buildEntryRow(consumerId));
  }
  return entries;
}

function buildStalePendingEntries(consumerIds, count) {
  const entries = [];
  const outcomes = [];
  const now = Date.now();
  for (let i = 0; i < count; i += 1) {
    const consumerId = pickRandom(consumerIds);
    const ageHours = STALE_HOURS + 6 + Math.random() * 240;
    const createdAt = new Date(now - ageHours * 60 * 60 * 1000);
    const status = pickRandom(PENDING_STATUSES);
    const entry = buildEntryRow(consumerId, {
      status,
      createdAt,
    });
    entries.push(entry);
    outcomes.push(
      ...buildOutcomeChain(entry, {
        finalOutcomeStatus: status,
        finalOutcomeCreatedAt: createdAt,
        intermediateCount: randomInt(0, 2),
      }),
    );
  }
  return { entries, outcomes };
}

function buildInconsistentChains(consumerIds, count) {
  const entries = [];
  const outcomes = [];
  const now = Date.now();
  for (let i = 0; i < count; i += 1) {
    const consumerId = pickRandom(consumerIds);
    const persistedStatus = pickRandom(['DRAFT', 'PENDING']);
    const latestOutcomeStatus = pickRandom(['COMPLETED', 'DENIED', 'UNCOLLECTIBLE']);
    const ageMinutes = INCONSISTENT_CHAIN_GRACE_MINUTES + 30 + Math.random() * 600;
    const outcomeAt = new Date(now - ageMinutes * 60 * 1000);
    const entry = buildEntryRow(consumerId, {
      status: persistedStatus,
      createdAt: new Date(outcomeAt.getTime() - 5 * 60 * 1000),
    });
    entries.push(entry);
    outcomes.push(
      ...buildOutcomeChain(entry, {
        finalOutcomeStatus: latestOutcomeStatus,
        finalOutcomeCreatedAt: outcomeAt,
        intermediateCount: randomInt(1, 3),
      }),
    );
  }
  return { entries, outcomes };
}

function buildLargeValueEntries(consumerIds, count) {
  const entries = [];
  const outcomes = [];
  for (let i = 0; i < count; i += 1) {
    const consumerId = pickRandom(consumerIds);
    const currencyCode = pickRandom(TRACKED_CURRENCIES);
    const amount = randomLargeAmount(currencyCode);
    const createdAt = randomCreatedWithinDays(20);
    const entry = buildEntryRow(consumerId, {
      currencyCode,
      amount,
      createdAt,
      status: pickRandom(['COMPLETED', 'PENDING']),
    });
    entries.push(entry);
    outcomes.push(...buildOutcomeChain(entry, { intermediateCount: randomInt(0, 2) }));
  }
  return { entries, outcomes };
}

function buildOutcomesForBaseline(entries) {
  const outcomes = [];
  for (const entry of entries) {
    outcomes.push(...buildOutcomeChain(entry, { intermediateCount: randomInt(0, 3) }));
  }
  return outcomes;
}

async function seed(consumerTarget, entryTarget) {
  const startedAt = Date.now();
  console.log(`[seed] target consumers=${consumerTarget} entries=${entryTarget}`);

  const consumerIds = await ensureConsumers(consumerTarget);
  console.log(`[seed] consumers ready: ${consumerIds.length}`);

  const existingEntries = await countExistingPerfEntries();
  console.log(`[seed] existing perf entries: ${existingEntries}`);

  if (existingEntries >= entryTarget) {
    console.log('[seed] entry target already met, skipping insert');
    return;
  }

  const remaining = entryTarget - existingEntries;
  const stalePendingTarget = Math.min(STALE_PENDING_TARGET, Math.floor(remaining * 0.01));
  const inconsistentTarget = Math.min(INCONSISTENT_CHAIN_TARGET, Math.floor(remaining * 0.005));
  const largeValueTarget = Math.min(LARGE_VALUE_TARGET, Math.floor(remaining * 0.02));
  const baselineTarget = remaining - stalePendingTarget - inconsistentTarget - largeValueTarget;

  console.log(
    `[seed] insert plan: baseline=${baselineTarget} stale=${stalePendingTarget} inconsistent=${inconsistentTarget} largeValue=${largeValueTarget}`,
  );

  const baselineEntries = buildBaselineEntries(consumerIds, baselineTarget);
  const baselineOutcomes = buildOutcomesForBaseline(baselineEntries);
  console.log(`[seed] baseline built: entries=${baselineEntries.length} outcomes=${baselineOutcomes.length}`);
  await insertEntries(baselineEntries);
  await insertOutcomes(baselineOutcomes);
  console.log('[seed] baseline inserted');

  const stale = buildStalePendingEntries(consumerIds, stalePendingTarget);
  await insertEntries(stale.entries);
  await insertOutcomes(stale.outcomes);
  console.log(`[seed] stale pending injected: ${stale.entries.length}`);

  const inconsistent = buildInconsistentChains(consumerIds, inconsistentTarget);
  await insertEntries(inconsistent.entries);
  await insertOutcomes(inconsistent.outcomes);
  console.log(`[seed] inconsistent chains injected: ${inconsistent.entries.length}`);

  const largeValue = buildLargeValueEntries(consumerIds, largeValueTarget);
  await insertEntries(largeValue.entries);
  await insertOutcomes(largeValue.outcomes);
  console.log(`[seed] large value entries injected: ${largeValue.entries.length}`);

  console.log('[seed] running ANALYZE on touched tables...');
  await prisma.$executeRawUnsafe('ANALYZE ledger_entry');
  await prisma.$executeRawUnsafe('ANALYZE ledger_entry_outcome');

  const elapsedMs = Date.now() - startedAt;
  console.log(`[seed] done in ${(elapsedMs / 1000).toFixed(1)}s`);
}

async function cleanup() {
  const startedAt = Date.now();
  console.log('[cleanup] removing perf-anomaly dataset...');

  const consumers = await prisma.consumerModel.findMany({
    where: { email: { startsWith: PERF_EMAIL_PREFIX } },
    select: { id: true },
  });
  console.log(`[cleanup] perf consumers found: ${consumers.length}`);

  if (consumers.length > 0) {
    const consumerIds = consumers.map((row) => row.id);
    for (const piece of chunk(consumerIds, 500)) {
      const deletedEntries = await prisma.ledgerEntryModel.deleteMany({
        where: { consumerId: { in: piece } },
      });
      console.log(`[cleanup]   deleted ${deletedEntries.count} ledger entries (outcomes cascaded)`);
    }
    for (const piece of chunk(consumerIds, 500)) {
      const deletedConsumers = await prisma.consumerModel.deleteMany({
        where: { id: { in: piece } },
      });
      console.log(`[cleanup]   deleted ${deletedConsumers.count} consumers`);
    }
  }

  const orphan = await prisma.$executeRaw`
    DELETE FROM ledger_entry
    WHERE metadata ->> ${PERF_METADATA_FLAG} = 'true'
  `;
  if (orphan > 0) {
    console.log(`[cleanup] removed ${orphan} orphan perf entries (no matching perf consumer)`);
  }

  const elapsedMs = Date.now() - startedAt;
  console.log(`[cleanup] done in ${(elapsedMs / 1000).toFixed(1)}s`);
}

function parseCli(argv) {
  const command = argv[0] ?? 'seed';
  const opts = { command, consumers: DEFAULT_CONSUMERS, entries: DEFAULT_ENTRIES };
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--consumers') {
      opts.consumers = Number.parseInt(argv[i + 1] ?? '', 10);
      i += 1;
    } else if (arg === '--entries') {
      opts.entries = Number.parseInt(argv[i + 1] ?? '', 10);
      i += 1;
    }
  }
  if (!Number.isFinite(opts.consumers) || opts.consumers <= 0) opts.consumers = DEFAULT_CONSUMERS;
  if (!Number.isFinite(opts.entries) || opts.entries <= 0) opts.entries = DEFAULT_ENTRIES;
  return opts;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  const opts = parseCli(process.argv.slice(2));
  if (opts.command === 'cleanup') {
    await cleanup();
    return;
  }
  if (opts.command === 'seed') {
    await seed(opts.consumers, opts.entries);
    return;
  }
  throw new Error(`Unknown command: ${opts.command}. Use 'seed' or 'cleanup'.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('[seed] failed:', error);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
