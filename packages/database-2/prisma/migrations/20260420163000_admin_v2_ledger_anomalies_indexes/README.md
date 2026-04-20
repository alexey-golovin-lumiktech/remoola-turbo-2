# Admin-v2 ledger anomalies indexes

This migration is additive-only.

## Changes

- adds `ledger_entry(type, status)` to support anomaly summary and class-filtered list probes
- adds `ledger_entry(status, created_at)` to support stale pending scans and bounded operator windows

## Safety expectations

- `CREATE INDEX CONCURRENTLY` is required to keep this zero-downtime and avoid long exclusive locks on `ledger_entry`
- `IF NOT EXISTS` guards partial application and makes reruns safer on lower environments
- the indexes are intentionally not declared in `schema.prisma` via `@@index` because Prisma migrations here must preserve `CONCURRENTLY`
- no backfill is required; runtime can roll forward once the indexes exist

## Release checks

1. Confirm both indexes exist on `ledger_entry`.
2. Confirm anomaly summary and list queries plan against the new indexes where expected.
3. Treat rollback as forward-fix; do not replace these indexes with blocking variants during rollout.
