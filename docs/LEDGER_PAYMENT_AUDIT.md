# Ledger & Payment Invariants Audit

**Scope:** admin-ledger service, balance-calculation service, consumer payments, shared ledger/balance code.  
**Focus:** Append-only ledger, no direct balance writes, idempotency, transactions/locking, double-spend/races.

---

## BLOCKERS

### 1. ~~Balance `COMPLETED_AND_PENDING` mode returned zero (fixed)~~

- **File:** `apps/api/src/shared/balance-calculation.service.ts`
- **Issue:** `buildStatusFilter(COMPLETED_AND_PENDING)` returned the string `"COMPLETED,PENDING"`. The raw SQL used `(COALESCE(latest.status, le.status))::text = ${statusFilter}`, so it compared effective status to the literal `'COMPLETED,PENDING'`, which never matches. All balance queries with `mode: COMPLETED_AND_PENDING` (e.g. `getBalancesIncludePending`) effectively returned 0.
- **Fix applied:** Replaced string filter with a SQL condition builder `buildStatusCondition(mode)` that returns `Prisma.Sql`: for `COMPLETED` use `= 'COMPLETED'`, for `COMPLETED_AND_PENDING` use `IN ('COMPLETED', 'PENDING')`. All three call sites (`calculateSingle`, `calculateMultiCurrency`, `calculateInTransaction`) now use `AND ${statusCondition}`.

---

## WARN (all addressed)

### 1. ~~Ledger outcome creation without idempotency (webhooks / scheduler)~~ — fixed

- **Files / lines:** stripe-webhook.service.ts, stripe.service.ts, stripe-reversal.scheduler.ts
- **Issue:** (as above) No unique on `(ledger_entry_id, external_id)`; at-least-once delivery could create duplicate outcome rows.
- **Fix applied:** Migration `20260303120000_ledger_entry_outcome_unique_external` adds partial unique index on `(ledger_entry_id, external_id) WHERE external_id IS NOT NULL`. Helper `createOutcomeIdempotent()` in `ledger-outcome-idempotent.ts` used for all outcome creates with `externalId`; P2002 is caught and treated as already-processed (debug log only).

### 2. ~~Stripe reversal scheduler: duplicate outcomes every run~~ — fixed

- **File:** stripe-reversal.scheduler.ts
- **Issue:** (as above) Scheduler appended a new outcome every run per stripeId.
- **Fix applied:** Scheduler uses `createOutcomeIdempotent(tx, …)`; unique index + P2002 handling makes re-runs idempotent.

### 3. ~~`createStripeReversal` (webhook) reversal ledger entries lack idempotency key~~ — fixed

- **File:** stripe-webhook.service.ts `createStripeReversal`
- **Issue:** (as above) Pre-check race allowed duplicate reversal entries under concurrent webhook delivery.
- **Fix applied:** Deterministic `idempotencyKey` on both ledger entry creates (`reversal:${kind}:${stripeObjectId}:payer` / `:requester`). P2002 from the transaction is caught and function returns without sending emails (already processed).

---

## NOTE (positive)

- **Admin ledger service** (`apps/api/src/admin/modules/ledger/admin-ledger.service.ts`): Read-only (findAll with search/filter). No ledger or balance writes.
- **Ledger append-only:** No `ledgerEntryModel.update` or `ledgerEntryModel.delete` in apps/api; only `create`. Fixtures use `deleteMany` in seed only. In dev/staging, consumer delete (e.g. via Prisma Studio) cascades and may remove ledger entries; production consumers with financial history must use soft-delete.
- **Balance calculation** (`apps/api/src/shared/balance-calculation.service.ts`): Balance is derived via SUM over ledger entries with LATERAL join for effective status; no balance table or direct balance writes. Advisory locks (`pg_advisory_xact_lock`) used when `acquireLock: true`.
- **Consumer withdraw/transfer** (`consumer-payments.service.ts`): Early idempotency check by `idempotencyKey`, then `$transaction` with advisory lock and balance check; ledger creates use unique `idempotencyKey`; P2002 on duplicate key is handled and existing entry returned.
- **Admin reversal** (`admin-payment-requests.service.ts`): Idempotency by `idempotencyKey` prefix, `$transaction` with advisory lock and balance check; ledger creates use idempotency keys.
- **Exchange** (`consumer-exchange.service.ts`): Idempotency by prefix, `$transaction` with lock and balance check; ledger creates use idempotency keys. One branch creates target entry outside transaction but with same idempotency key (second create would hit unique).
- **Stripe webhook event dedup:** `stripeWebhookEventModel.create({ eventId })` with P2002 handling ensures at-most-once processing per event at the gateway; outcome/ledger steps inside still need to be idempotent as above.
- **Payment request updates:** `paymentRequestModel.update` / `updateMany` used for request status (e.g. DRAFT→PENDING, COMPLETED) and in webhooks; not ledger/balance tables.

---

## Minimal diffs for remaining items

### 1. Outcome idempotency (WARN 1 & 2): DB unique + handle P2002

**Migration (add to a new migration file):**

```sql
-- Ensure at most one outcome per (ledger_entry_id, external_id) when external_id is set.
CREATE UNIQUE INDEX idx_ledger_entry_outcome_ledger_entry_external
  ON ledger_entry_outcome (ledger_entry_id, external_id)
  WHERE external_id IS NOT NULL;
```

Then in code, wherever outcome is created with `externalId`, catch `P2002` and treat as already-processed (e.g. skip or return existing). For outcomes without `externalId` (e.g. some DENIED paths), either assign a synthetic key (e.g. `source:reason`) or keep current behavior and accept possible duplicates only for those cases.

### 2. Stripe reversal scheduler (WARN 2): check before create

In `stripe-reversal.scheduler.ts`, before the loop that creates outcomes:

```ts
for (const entry of entries) {
  const existing = await tx.ledgerEntryOutcomeModel.findFirst({
    where: { ledgerEntryId: entry.id, externalId: stripeId },
  });
  if (existing) continue;
  await tx.ledgerEntryOutcomeModel.create({ ... });
}
```

Or rely on the unique index above and catch P2002.

### 3. createStripeReversal idempotency key (WARN 3)

In `stripe-webhook.service.ts` `createStripeReversal`, add idempotency keys to the two ledger creates, e.g.:

- `idempotencyKey: \`reversal:${kind.toLowerCase()}:${stripeObjectId}:payer\``
- `idempotencyKey: \`reversal:${kind.toLowerCase()}:${stripeObjectId}:requester\``

and remove or keep the existing `stripeId`-based pre-check; on P2002 return early (already created).

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| BLOCKER  | 1     | Fixed (balance COMPLETED_AND_PENDING) |
| WARN     | 3     | Fixed (unique index + P2002 handling + reversal idempotency keys) |
| NOTE     | 8     | No change |

Ledger and consumer money flows use append-only ledger, derived balance, transactions with advisory locks, and idempotency keys. Outcome idempotency is enforced by DB unique index on `(ledger_entry_id, external_id)` and `createOutcomeIdempotent()`; reversal creation is idempotent via `idempotencyKey` and P2002 handling.
