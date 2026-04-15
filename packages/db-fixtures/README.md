# @remoola/db-fixtures

Deterministic fixture seeding utilities for migration safety testing and local `admin-v2` development.

## Local admin-v2 profile

The current default fixture profile is a scenario-first `admin-v2` dataset.

It seeds a fixed set of operational cases instead of random rows:

- consumer investigation cases with notes, flags, documents and payment methods
- verification states: `PENDING`, `MORE_INFO`, `FLAGGED`, `APPROVED`, `REJECTED`
- payments states: `COMPLETED`, `PENDING`, `DENIED`, `UNCOLLECTIBLE`, `WAITING_RECIPIENT_APPROVAL`
- ledger timelines with append-only outcomes, payout failures/stuck payouts and disputes
- audit trails across auth, consumer actions and admin actions
- exchange coverage with live/stale rates and scheduled FX in `PENDING`, `PROCESSING`, `FAILED`, `EXECUTED`

Fixture rows are namespaced under `fixture-admin-v2` for safe cleanup.

## Commands

- `DATABASE_URL="postgresql://wirebill:wirebill@127.0.0.1:5433/remoola" yarn workspace @remoola/db-fixtures run fill`
  - Cleans existing `fixture-admin-v2` rows, then inserts a fresh admin-v2 scenario pack.
- `DATABASE_URL="postgresql://wirebill:wirebill@127.0.0.1:5433/remoola" yarn workspace @remoola/db-fixtures run cleanup`
  - Deletes only `fixture-admin-v2` rows without inserting new data.
- `DATABASE_URL="postgresql://wirebill:wirebill@127.0.0.1:5433/remoola" yarn workspace @remoola/db-fixtures run refresh -- --confirm`
  - Truncates app tables and re-fills the admin-v2 scenario pack from scratch.
- `DATABASE_URL="postgresql://wirebill:wirebill@127.0.0.1:5433/remoola" yarn workspace @remoola/db-fixtures run refresh -- --per-table=20 --confirm`
  - Same as above; `--per-table` is retained for CLI compatibility and summary output.

## Notes

- `--per-table` is clamped to `1..20`.
- Script refuses to run when `NODE_ENV=production`.
- `refresh` requires explicit `--confirm`.
- `refresh` truncates business tables with CASCADE and is kept in sync with `packages/database-2` Prisma schema.
- The fixture pack is intentionally deterministic so admin-v2 queues and case pages stay stable across repeated refreshes.
