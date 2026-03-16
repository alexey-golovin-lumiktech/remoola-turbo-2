# Consumer action log migration notes

This migration is additive-only and creates the append-only `consumer_action_log` partitioned table.

## Safety expectations

- Deploy database migration before API rollout.
- Keep default partition in place to avoid insert failures at partition boundaries.
- Treat rollback as forward-fix: do not drop this audit table in routine rollback paths.
- `ledger_entry_dispute` uniqueness hardening is enforced by follow-up Prisma migration `20260316150500_enforce_ledger_entry_dispute_unique`.

## Verification checklist

Run and capture outputs in CI/staging:

1. `yarn workspace @remoola/api test --runInBand src/consumer/auth/consumer-action-log-partition-maintenance.scheduler.spec.ts`
2. `yarn workspace @remoola/api test --runInBand src/consumer/auth/consumer-action-log-retention.scheduler.spec.ts`
3. `yarn workspace @remoola/api test --runInBand test/consumer-action-log.e2e-spec.ts`
4. `yarn workspace @remoola/api test --runInBand test/consumer-action-log-retention.e2e-spec.ts`

Operational validation:

- Confirm monthly partitions plus default partition exist after migrate.
- Confirm retention job drops out-of-window partitions and boundary-batch deletes old rows in active partition.

## Dispute dedupe uniqueness

Uniqueness for `ledger_entry_dispute` on:

- `("ledger_entry_id", "stripe_dispute_id")`

is enforced by migration `20260316150500_enforce_ledger_entry_dispute_unique`.

Safe rollout for non-empty existing databases is two-phase:

1. predeploy: create unique index concurrently (non-blocking path)
2. migration: fail fast on duplicates and attach table constraint using existing index

Final enforced constraint:

- `CONSTRAINT "ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key" UNIQUE ("ledger_entry_id", "stripe_dispute_id")`

### Required preflight duplicate check (must be zero before index/migration)

```sql
SELECT "ledger_entry_id", "stripe_dispute_id", COUNT(*) AS cnt
FROM "ledger_entry_dispute"
GROUP BY "ledger_entry_id", "stripe_dispute_id"
HAVING COUNT(*) > 1;
```

If rows are returned, stop rollout and dedupe before continuing.

### Required predeploy index creation (non-transactional)

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
"ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key"
ON "ledger_entry_dispute"("ledger_entry_id", "stripe_dispute_id");
```

Then apply migration `20260316150500_enforce_ledger_entry_dispute_unique` to attach the table constraint using this index.

For fresh empty databases (for example, ephemeral CI test DBs), the migration can create the constraint directly because no existing rows are present.

Capture evidence after migration:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = current_schema()
  AND tablename = 'ledger_entry_dispute'
  AND indexname = 'ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key';
```

## Partition boundary verification (UTC contract)

`consumer_action_log` partition precreate uses UTC month boundaries in SQL and must stay aligned with scheduler UTC utilities.

Required post-migration verification:

```sql
SELECT
  child.relname AS partition_name,
  pg_get_expr(child.relpartbound, child.oid) AS partition_bounds
FROM pg_inherits inh
JOIN pg_class parent ON parent.oid = inh.inhparent
JOIN pg_class child ON child.oid = inh.inhrelid
WHERE parent.relname = 'consumer_action_log'
ORDER BY child.relname;
```

Validate:

- expected monthly partitions are present
- bounds are UTC month windows
- `consumer_action_log_pdefault` exists

## Release gate evidence (required)

Do not promote API runtime deployment until all evidence is attached:

1. duplicate scan output showing zero duplicate groups
2. migration apply output + index/constraint definition query result
3. post-migration partition boundary verification output (including default partition)

## Abort/retry playbook

If duplicate scan fails:

1. Abort rollout for this change set.
2. Run dedupe workflow for `ledger_entry_dispute`.
3. Re-run duplicate scan until zero rows.
4. Re-run `CREATE UNIQUE INDEX CONCURRENTLY ...`.
5. Continue migration/runtime rollout only after all release-gate evidence is collected.

If concurrent index creation fails due to lock/timeouts/transient conditions:

1. Keep rollout paused.
2. Re-run the same `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ...` command.
3. Re-verify with the index evidence query.
4. Continue only after success evidence is recorded.

## Deferred runtime deployment validation

After DB migration + operational predeploy steps, run staging/prod-like runtime validation before Vercel production cutover:

- auth + consumer action log write paths
- partition maintenance scheduler run
- retention scheduler run
