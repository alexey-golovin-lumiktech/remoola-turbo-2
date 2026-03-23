# Ledger entry outcome: unique (ledger_entry_id, external_id)

Adds a **partial unique index** so at most one outcome row exists per `(ledger_entry_id, external_id)` when `external_id` is set. Enables idempotent outcome creation for Stripe webhooks and the reversal scheduler (at-least-once delivery).

**Reference:** `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md` (ledger idempotency / append-only invariants).

## Preflight (FIN-001): check for existing duplicates

Before applying this migration, run on a read replica or staging to ensure no duplicates exist (otherwise the unique index creation will fail):

```sql
-- Duplicates would block the unique index. Expect 0 rows.
SELECT ledger_entry_id, external_id, COUNT(*) AS cnt
FROM ledger_entry_outcome
WHERE external_id IS NOT NULL
GROUP BY ledger_entry_id, external_id
HAVING COUNT(*) > 1;
```

If any rows are returned, decide remediation (e.g. keep latest per (ledger_entry_id, external_id), delete older duplicates) and document. Then re-run the query to confirm 0 duplicate groups before deploying.

## What this migration does

- Creates unique partial index: `(ledger_entry_id, external_id) WHERE external_id IS NOT NULL`.
- Additive only; no table/column changes.

## Deploy order

1. Run preflight query; remediate duplicates if any.
2. `npx prisma migrate deploy`.
3. Deploy application that catches P2002 on outcome creates with `externalId` and treats as already-processed.

## Rollback

```sql
DROP INDEX IF EXISTS idx_ledger_entry_outcome_ledger_entry_external;
```

Safe; application must then not rely on this uniqueness for idempotency.
