## Migration purpose

Attach DB-level uniqueness for `ledger_entry_dispute(ledger_entry_id, stripe_dispute_id)` to match Prisma `@@unique`.

## Safe rollout contract

Preferred for non-empty existing databases: precreate the index below in a non-transactional predeploy step to avoid long transactional locks:

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
"ledger_entry_dispute_ledger_entry_id_stripe_dispute_id_key"
ON "ledger_entry_dispute"("ledger_entry_id", "stripe_dispute_id");
```

The migration then:

1. fails fast if duplicate groups still exist
2. uses `UNIQUE USING INDEX` only when the named index is attachable:
   - belongs to `ledger_entry_dispute`
   - unique + valid
   - not partial / not expression
   - key columns exactly `("ledger_entry_id", "stripe_dispute_id")` in order
3. if the named index is missing, creates it in-migration and re-checks attachability (compatible with CI/ephemeral DBs), while emitting a notice that this path may hold stronger locks on non-empty databases.
4. if attachability still fails, enforces the same uniqueness via direct `ADD CONSTRAINT ... UNIQUE ("ledger_entry_id", "stripe_dispute_id")` fallback.
