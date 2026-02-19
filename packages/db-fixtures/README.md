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
