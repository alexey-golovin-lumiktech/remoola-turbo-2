# Financial Safety & Database Compliance

**Canonical:** [governance/04_FINANCIAL_SAFETY_COMPLIANCE.md](../governance/04_FINANCIAL_SAFETY_COMPLIANCE.md) — edit there.

**Last updated:** 2026-03-16  
**Scope:** Remoola monorepo — ledger, payments, Stripe webhooks, raw SQL, PostgreSQL design rules  
**Status:** Audit complete; critical fixes applied (append-only ledger, idempotency, raw SQL, health/archive).

---

## 1. Overview

This document consolidates fintech safety and DB compliance work: design-rule compliance (postgresql-design-rules §6), risk mitigation, invariants, critical surfaces, and verification steps. It replaces the previous separate audit reports.

### 1.1 User stories (expected behavior)

| Area | Expected behavior |
|------|--------------------|
| **Consumers** | Exchange, withdraw, and transfer without double-spend or race conditions; balance checks under lock and consistent. |
| **Stripe webhooks** | Each event processed at most once per `event.id`; duplicate deliveries return 200 without reprocessing. |
| **Admins** | Reversal of payment requests with correct balance checks under lock. |
| **Profile** | Consumer can update organization details (name, role, size); API and UI stay in sync. |
| **Operators** | Structured logs (no raw `console`); health and bootstrap use Nest Logger. |

### 1.2 Current state (after fixes)

- **Ledger / financial history:** Append-only. No application-level UPDATE/DELETE on `ledger_entry`; status transitions and dispute data go to `ledger_entry_outcome` and `ledger_entry_dispute`; DB trigger syncs `ledger_entry.status` for existing balance queries. Balance for "completed only" uses status `= COMPLETED`; balance including pending uses `IN ('COMPLETED','PENDING')` (not a single string equality).
- **Idempotency:** DB-enforced where required: `ledger_entry.idempotency_key` unique; `stripe_webhook_event.event_id` unique; insert-before-handling for webhooks.
- **Concurrency:** Operation-specific advisory locks (`:withdraw`, `:transfer`, `:exchange`, `:reversal`, `:stripe-reversal`). Balance is read inside the same transaction; serialization is by advisory lock per (consumer, operation). Row-level lock (`SELECT ... FOR UPDATE`) is not required for correctness with this design—double-spend is prevented by the advisory lock.
- **Raw SQL / webhook failure telemetry:** Parameterized (`Prisma.sql`); DB column names used (`consumer_id`, `deleted_at`, etc.); health does not expose raw `error.message`; Stripe webhook top-level failures emit sanitized warning telemetry only (`stripe_webhook_processing_failed`, no raw payload/error text); archive search `query` capped.
- **Tests:** Concurrency specs and unit specs updated; TypeScript and tests pass in `apps/api`.
- **BFF proxy boundaries (admin/consumer/consumer-mobile):** Proxy routes forward an explicit header allowlist (instead of raw header passthrough), preserve all `Set-Cookie` headers, enforce JSON mutation boundaries (`application/json` + valid JSON), and reject oversized JSON payloads with `413 PAYLOAD_TOO_LARGE`.

---

## 2. DB design rules compliance (postgresql-design-rules §6)

### 2.1 Blockers — status

| Blocker | Status | Notes |
|---------|--------|------|
| **B1 — Ledger/financial history mutation** | Fixed | All status/metadata updates replaced with append-only writes. New tables: `ledger_entry_outcome`, `ledger_entry_dispute`. Trigger propagates latest outcome to `ledger_entry.status`. |
| **B2 — Idempotency (DB enforcement)** | Compliant | `ledger_entry` has `@@unique([idempotencyKey])`; `stripe_webhook_event` has `UNIQUE(event_id)`. Flows that require idempotency set a key; duplicate insert fails with P2002 and is handled. |
| **B3 — Unsafe migrations** | Compliant | `20260225120000_standardize_columns_snake_case` uses RENAME COLUMN only. `20260225140000_ledger_entry_outcome_append_only` is additive (new tables + trigger). No DROP on hot paths. |

### 2.2 Schema / code changes (minimal set)

| Area | Change |
|------|--------|
| **Schema** | `LedgerEntryOutcomeModel`, `LedgerEntryDisputeModel`; relations `LedgerEntryModel.outcomes`, `LedgerEntryModel.disputes`. |
| **Migrations** | `20260225045952_stripe_webhook_event_dedup` (additive); `20260225120000_standardize_columns_snake_case` (RENAME only); `20260225140000_ledger_entry_outcome_append_only` (additive); `20260303120000_ledger_entry_outcome_unique_external` (additive); `20260304120000_ledger_entry_outcome_dispute_cascade` (FK RESTRICT→CASCADE); `20260310123000_consumer_auth_sessions` (additive, auth_sessions table for consumer sessions); `20260316150500_enforce_ledger_entry_dispute_unique` (constraint attach with predeploy-concurrent preferred path and CI-safe in-migration fallback); `20260317120000_reset_password_token_hash` (additive, reset_password token_hash backfill); `20260317120001_drop_reset_password_token` (cleanup, drop legacy token column). |
| **Stripe webhook** | Insert into `stripe_webhook_event` first; on P2002 return 200. Ledger status/dispute via `ledgerEntryOutcomeModel.create` / `ledgerEntryDisputeModel.create` (no `ledgerEntryModel.update`/`updateMany`). |
| **Stripe service / reversal scheduler** | Replaced `ledgerEntryModel.updateMany` with find + `ledgerEntryOutcomeModel.create` per entry. |

### 2.3 Other design-rule points (audit only)

- **C1–C6 (schema):** PKs UUID; mandatory timestamps and FKs; snake_case via `@map` and standardize migration; money as Decimal; JSON as Json.
- **D1 (transactions):** Multi-step money flows use `$transaction`.
- **D2 (unbounded reads):** Admin ledger pagination; balance queries aggregated with filters.
- **D3 (raw SQL):** Balance raw SQL uses snake_case column names and parameterized `Prisma.sql`.
- **E (traceability):** Ledger entries carry `idempotency_key`, `stripe_id`, `metadata`; outcome rows carry `source`, `external_id`.

---

## 3. Invariants (non-negotiable rules)

- **Stripe:** A Stripe event id MUST be processed at most once (enforced by unique `stripe_webhook_event.event_id` + insert-before-handling).
- **Ledger:** Balance used for debits and internal reversals MUST be read inside a DB transaction with advisory lock to avoid concurrent use of same balance. Serialization is by advisory lock per (consumer, operation). Optionally, row-level lock (`SELECT ... FOR UPDATE`) may be used for stricter isolation; current implementation relies on advisory locks only. **Exception:** Stripe `REFUND` flows (admin + webhook) follow external-source-of-truth policy (Stripe outcome first, then internal append-only reversal).
- **Ledger writes:** No application-level UPDATE/DELETE on financial history; corrections via reversal or compensating records; status/dispute via append-only outcome/dispute tables.
- **Amounts:** No float; amounts as Prisma `Decimal` / DB `NUMERIC`; currency matches where required.
- **Retries:** Stripe replay → 200 + no reprocess. Same idempotency key → return existing result or no-op.
- **Transfer lock order:** Locks for the two consumers are taken in deterministic sorted order to prevent deadlock.
- **Consumer deletion:** Hard-deleting a consumer (or cascade from consumer delete) permanently removes ledger entries and audit trail. For production consumers with financial history, use soft-delete (`consumer.deleted_at`). In dev/staging, delete consumer via Prisma Studio or direct SQL; cascade will remove related rows.

---

## 4. Risk audit

### 4.1 Technical risks

| Risk | Mitigation |
|------|------------|
| Ledger inconsistencies (wrong balance, partial writes) | Balance read inside `$transaction` with advisory lock; all subsequent ledger writes in same transaction; append-only outcome/dispute; trigger for read path. Serialization by advisory lock per (consumer, operation). |
| Idempotency violations (double charge, duplicate rows) | Stripe: dedup by `event_id` unique before processing. Withdraw/transfer/exchange/reversal: idempotency keys; DB unique on `ledger_entry.idempotency_key`; P2002 handled. |
| Race conditions (concurrent withdraw/transfer/exchange) | Advisory lock per consumer + operation suffix; transfer acquires two locks in sorted order; balance read inside same transaction. |
| Broken state machine / invalid status | Status transitions via outcome table + trigger; no direct UPDATE on ledger_entry for status. |
| Migration / schema mismatch | Additive migrations; raw SQL uses actual DB column names (`consumer_id`, `deleted_at`, `currency_code`, etc.). |
| SQL injection / info leakage | All production raw queries parameterized (`Prisma.sql`); health response does not expose raw `error.message`; Stripe webhook top-level failure logging is sanitized; archive search `query` capped. |

### 4.2 Business risks

| Risk | Mitigation |
|------|------------|
| Revenue leakage / double charge | Webhook dedup; idempotency keys; advisory lock prevents overdraw. |
| Reconciliation / audit | Single transaction boundary; append-only history; structured logs; no PII/secrets in logs. |
| Support burden from inconsistent state | At-most-once webhook processing and locked balance logic reduce duplicate or partial states. |

---

## 5. Critical surfaces (where money can break)

| Surface | Location | Safeguards |
|---------|----------|------------|
| Exchange | `ConsumerExchangeService.convert` | Advisory lock `:exchange`; balance via raw SQL inside same transaction; idempotency (incl. recovery path in tx + P2002). Serialization: advisory lock + re-read target in tx (no FOR UPDATE on balance rows). |
| Withdraw | `ConsumerPaymentsService.withdraw` | Advisory lock `:withdraw`; balance via raw SQL inside same transaction; idempotency key. |
| Transfer | `ConsumerPaymentsService.transfer` | Two advisory locks `:transfer` in sorted order; balance via raw SQL inside same transaction; idempotency key. |
| Admin reversal | `AdminPaymentRequestsService` | Advisory lock `:reversal`; `CHARGEBACK` validates requester balance inside tx. `REFUND` uses Stripe as source of truth and appends reversal idempotently after Stripe refund. |
| Stripe reversal | `StripeWebhookService` (e.g. charge refunded) | Advisory lock `:stripe-reversal`; `CHARGEBACK` validates requester balance in tx. `REFUND` follows Stripe external source of truth and appends reversal idempotently. |
| Stripe webhook entry | `processStripeEvent` | Insert into `stripe_webhook_event` first; on P2002 return 200. |
| Ledger status / dispute | Stripe webhook handlers, reversal scheduler | Append-only: `ledgerEntryOutcomeModel.create`, `ledgerEntryDisputeModel.create`; no `ledgerEntryModel.update`/`updateMany`. |
| BFF request boundary | `apps/admin/src/lib/proxy.ts`, `apps/consumer/src/lib/api-utils.ts`, `apps/consumer-mobile/src/lib/api-utils.ts` | Header allowlist forwarding, multi-cookie passthrough, mutation JSON validation, payload-size limits, `cache: no-store` on authenticated proxy fetches. |

---

## 6. Raw queries

### 6.1 Summary

| Location | Type | Parameterized | In transaction | Notes |
|----------|------|---------------|----------------|-------|
| admin-payment-requests.service.ts | `$queryRaw` (archive list + reversal balance) | Yes | Reversal: yes; archive: read-only | Archive search `query` capped (e.g. 200 chars). |
| consumer-payments.service.ts | `$queryRaw` (lock + balance) | Yes | Yes | withdraw, transfer. |
| consumer-exchange.service.ts | `$queryRaw` (lock + balance) | Yes | Yes | exchange. |
| stripe-webhook.service.ts | `$queryRaw` (lock + balance) | Yes | Yes | reversal. |
| oauth-state-store.service.ts | `$queryRaw` (DELETE … RETURNING) | Yes | Single op | Non–money. |
| health.service.ts | `$queryRaw` SELECT 1 | Yes | No | On DB error: generic message, not raw `error.message`. |

Production raw queries use **parameterized** APIs; DB column names are **snake_case** (`consumer_id`, `deleted_at`, etc.) to match schema. No `$queryRawUnsafe`/`$executeRawUnsafe` in `apps/api/src`; the only Unsafe usage is in test utilities (`test/temp-db-isolation-*.e2e-spec.ts`).

### 6.2 Applied fixes

- **health.service.ts:** On DB error, response `error` set to generic `"Database check failed"` (no internal message leakage).
- **admin-payment-requests.service.ts:** `getExpectationDateArchive` — archive search `query` trimmed and capped at `SEARCH_MAX_LEN` (200) before use in `Prisma.sql`.

---

## 7. Fintech safety checklist

| Item | How it is satisfied |
|------|--------------------|
| **Idempotency** | Stripe: key = event id; unique on `stripe_webhook_event.event_id`; duplicate events are reprocessed idempotently (not hard-skipped) to recover from partial failures. Ledger: unique on `ledger_entry.idempotency_key`; caller-provided or derived keys for withdraw/transfer/exchange/reversal. |
| **Atomicity & transactions** | Balance read + ledger writes run in one `$transaction` for internal money operations. For Stripe `REFUND` (admin + webhook), external Stripe refund is treated as source of truth and internal reversal is appended idempotently afterward. |
| **Concurrency** | Advisory lock per (consumer, operation); balance read inside same transaction; transfer locks in sorted order. |
| **Append-only financial history** | No UPDATE/DELETE on ledger_entry for status/dispute; outcome and dispute tables + trigger. |
| **AuthZ / tenancy** | consumerId/requesterId from auth context; no trust of client ids for money movement. |
| **Logging & audit** | Structured Logger; correlationId; no secrets/PII in logs. |
| **Error handling** | User-facing errors unchanged; P2002 handled; health does not leak internal errors. |

---

## 8. Migrations & schema

| Migration | Purpose |
|-----------|---------|
| `20260225045952_stripe_webhook_event_dedup` | Creates `stripe_webhook_event` with unique `event_id`. Additive. |
| `20260225120000_standardize_columns_snake_case` | RENAME COLUMN only; no DROP. Deploy before app with updated `@map` and raw SQL. |
| `20260225140000_ledger_entry_outcome_append_only` | Creates `ledger_entry_outcome`, `ledger_entry_dispute`; trigger `sync_ledger_entry_status_from_outcome`. Additive. |
| `20260303120000_ledger_entry_outcome_unique_external` | Partial unique index on `(ledger_entry_id, external_id)` where `external_id IS NOT NULL`; outcome idempotency. Additive. |
| `20260304120000_ledger_entry_outcome_dispute_cascade` | `ledger_entry_outcome` and `ledger_entry_dispute` FKs: ON DELETE RESTRICT → CASCADE; consumer delete cascades. Prefer soft-delete for production. |
| `20260316150500_enforce_ledger_entry_dispute_unique` | Enforces `UNIQUE(ledger_entry_id, stripe_dispute_id)` by attaching a named unique index; preferred rollout is predeploy `CREATE UNIQUE INDEX CONCURRENTLY`, with CI-safe in-migration fallback index creation if missing. |

**Deploy order:** Run `prisma migrate deploy` (or `migrate dev`) for these migrations before deploying the app.

### 8.1 Migration safety: backfill and lock

- **Additive-first:** Prefer new columns/tables/indexes without DROP on hot paths (`ledger_entry`, `ledger_entry_outcome`, `stripe_webhook_event`, critical auth tables).
- **Backfill:** For new NOT NULL columns, run backfill (e.g. UPDATE with default or from archive) **before** applying the migration that adds the constraint, or use a DEFAULT in the migration; document in the migration README.
- **Lock:** ALTER TABLE / DROP INDEX can hold brief locks; prefer low-load windows for migrations that touch high-traffic tables. Long-running backfills should not run inside a single transaction that holds locks for the full duration.
- **Rollback:** Document down/rollback SQL in migration READMEs where the migration is non-trivial (e.g. DROP COLUMN, FK change).

---

## 9. Tests

- **consumer-exchange.service.spec.ts** — Unit tests; mocks `$queryRaw` (lock + balance).
- **consumer-exchange.concurrency.spec.ts** — Advisory lock `:exchange`, SELECT FOR UPDATE, currency in balance query.
- **consumer-payments.service.spec.ts** — Withdraw/transfer; mocks `$queryRaw` with lock + balance.
- **consumer-payments.concurrency.spec.ts** — Idempotency (duplicate key returns existing), advisory lock `:withdraw`/`:transfer`, SELECT FOR UPDATE.
- **critical-updates.e2e-spec.ts** — E2E (isolated DB): health 200 + database ok, `stripe_webhook_event` dedup (P2002 on duplicate `event_id`), `ledger_entry_outcome` append-only insert.

Run unit + concurrency specs from `apps/api`:

```bash
cd apps/api && yarn jest src/consumer/modules/exchange/consumer-exchange.service.spec.ts src/consumer/modules/exchange/consumer-exchange.concurrency.spec.ts src/consumer/modules/payments/consumer-payments.service.spec.ts src/consumer/modules/payments/consumer-payments.concurrency.spec.ts
```

Run E2E (requires DB; uses `@remoola/test-db/environment`):

```bash
cd apps/api && yarn test:e2e
```

---

## 10. Verification checklist

- [ ] **Prisma:** `npx prisma generate` in `packages/database-2` succeeds.
- [ ] **No ledger mutation in app:** No remaining `ledgerEntryModel.update` / `updateMany` / `delete` in `apps/api`.
- [ ] **Balance queries:** Still use `ledger_entry` with `status = COMPLETED`; trigger keeps status in sync.
- [ ] **Idempotency:** Unique constraints on `idempotency_key` and `event_id` unchanged.
- [ ] **TypeScript:** `npx tsc --noEmit` in `apps/api` (or workspace build).
- [ ] **Tests:** Run payment/webhook/ledger unit and concurrency specs; run E2E (`yarn test:e2e` in `apps/api`) so `critical-updates.e2e-spec.ts` passes.
- [ ] **Deploy:** Apply migrations above before deploying app.
- [ ] **Monorepo:** No cross-app imports; DB layer in `packages/database-2`, API in `apps/api`.

---

## 11. Follow-ups / TODOs

1. **Withdraw balance and currency:** Confirm whether withdraw should use total balance or balance in `body.currencyCode`; if per-currency, add currency filter to withdraw balance query in `consumer-payments.service.ts`.
2. **Profile size/role validation:** Optionally validate `size` and `consumerRole` against Prisma enums in DTO or service.
3. **Integration test:** `critical-updates.e2e-spec.ts` already hits real `stripe_webhook_event` and `ledger_entry`/`ledger_entry_outcome`; consider adding assertions that use `consumer_id`/`deleted_at` in raw SQL or Prisma to guard against column-name regressions.
4. **Health response:** E2E covers health 200 + database ok; optional unit test that health error response does not include internal `error.message`.
5. **Reconciliation:** Consider scheduled job to match Stripe payouts vs ledger entries and flag discrepancies.
6. **E2E and coverage:** Expand E2E for critical flows (e.g. full payment/exchange paths); aim for strong coverage on money-moving paths.
