# Admin-v2 ledger anomalies indexes

This migration is additive-only.

## Changes

- adds `ledger_entry(type, status)` to support anomaly summary and class-filtered list probes
- adds `ledger_entry(status, created_at)` to support stale pending scans and bounded operator windows

## Safety expectations

- preferred rollout for non-empty databases is a non-transactional predeploy step that runs `CREATE INDEX CONCURRENTLY`
- this Prisma migration keeps a transactional `CREATE INDEX IF NOT EXISTS` fallback so CI and ephemeral test databases can apply it inside `prisma migrate deploy`
- `IF NOT EXISTS` guards partial application and makes reruns safer on lower environments
- the indexes are intentionally not declared in `schema.prisma` via `@@index` because the production-safe path still relies on manual `CONCURRENTLY`
- no backfill is required; runtime can roll forward once the indexes exist

### Preferred predeploy step for non-empty databases

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ledger_entry_type_status_idx"
  ON "ledger_entry" ("type", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ledger_entry_status_created_at_idx"
  ON "ledger_entry" ("status", "created_at");
```

## Release checks

1. Confirm both indexes exist on `ledger_entry`.
2. Confirm anomaly summary and list queries plan against the new indexes where expected.
3. Treat rollback as forward-fix; do not replace these indexes with blocking variants during rollout.
