## Why

`apps/api-v2` had several raw SQL access paths that filtered `payment_request` by:

- authenticated participant UUID (`payer_id` / `requester_id`)
- email-only participant fallback (`payer_email` / `requester_email` when FK is null)
- recency ordering by `created_at DESC, id DESC`

After the remediation pass removed `UUID::text` comparisons from hot queries, the remaining planner gap was
`payment_request` participant filtering, especially when UUID and email-only branches are combined.

These indexes support the new query shape:

- composite btree indexes for UUID participant branches
- partial expression indexes for case-insensitive email-only branches

## Safety notes

- Additive only; no column drops or rewrites.
- Targets a non-partitioned table (`payment_request`), so the partitioned-table `ATTACH PARTITION` workflow is not needed here.
- For Neon / Vercel Postgres, verify with read-only `EXPLAIN` after rollout; do not use fixture fill on remote.
