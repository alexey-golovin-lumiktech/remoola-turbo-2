# @remoola/db-fixtures

Deterministic fixture seeding utilities for migration safety testing.

## Commands

- `yarn workspace @remoola/db-fixtures run fill`
  - Cleans existing fixture rows, then inserts fresh fixture rows.
- `yarn workspace @remoola/db-fixtures run cleanup`
  - Deletes only fixture-tagged rows without inserting new data.
- `yarn workspace @remoola/db-fixtures run refresh -- --per-table=10 --confirm`
  - Truncates app tables and re-fills deterministic fixture data.

## Notes

- `--per-table` is clamped to `1..20`.
- Script refuses to run when `NODE_ENV=production`.
- `refresh` requires explicit `--confirm`.
- `refresh` truncates app tables (auth_audit_log, admin_action_audit_log, auth_login_lockout, ledger_entry_outcome, ledger_entry_dispute, ledger_entry, and other business tables) with CASCADE. Kept in sync with `packages/database-2` Prisma schema.
