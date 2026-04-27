# Consumer Browser Identity and Tracking

This document describes how consumer tracking currently works in the maintained API/frontend surface, and how browser identity is correlated to consumer actions in `consumer-css-grid`.

## Scope

- API: `apps/api-v2`
- Web app: `apps/consumer-css-grid`
- Persistence: `packages/database-2` (`consumer_action_log`)

## Goals

- Keep browser identity backend-managed via `deviceId` cookie.
- Track consumer actions on selected endpoints only.
- Keep tracking append-only and non-blocking.
- Preserve auth, CSRF, OAuth, and BFF compatibility.
- Keep browser identity aligned to the canonical `consumer-css-grid` scope.

## Core Components

### 1) Browser identity resolver (`deviceIdMiddleware`)

Path: `apps/api-v2/src/common/middleware/device-id.middleware.ts`

Responsibilities:

- Runs only for consumer API paths (`/api/consumer*`).
- Requires an explicit consumer `x-remoola-app-scope` header before reading scoped cookies.
- Reads only the compatible device cookie keys for that app scope (host key and local fallback).
- Accepts only signed scoped device cookies; unsigned legacy cookie values are ignored and rotated to a new signed cookie.
- Validates UUID v4 format.
- Generates UUID v4 if missing/invalid.
- Attaches `req.deviceId` for downstream handlers.
- Attempts cookie write but never fails request flow on write errors.

### 2) Action decorator (`TrackConsumerAction`)

Path: `apps/api-v2/src/common/decorators/track-consumer-action.decorator.ts`

Responsibilities:

- Marks handlers that should be tracked.
- Provides action metadata (`action`, optional `resource`, optional `result`).

### 3) Tracking interceptor (`ConsumerActionInterceptor`)

Path: `apps/api-v2/src/common/interceptors/consumer-action.interceptor.ts`

Responsibilities:

- Runs globally but no-ops outside `/api/consumer*`.
- Reads decorator metadata from handler.
- Emits success/failure action names:
  - Success: `<action>_success` (or `<action>_<result>` if provided)
  - Failure: `<action>_failure`
- Collects low-risk request context:
  - `deviceId`, `consumerId` (if consumer identity exists), `method`, `path`, `correlationId`
  - optional minimized network metadata when explicitly enabled (`ipAddress` prefix mask and normalized `userAgent`)
- Calls `ConsumerActionLogService.record(...)` asynchronously.

### 4) Persistence service (`ConsumerActionLogService`)

Path: `apps/api-v2/src/shared/consumer-action-log.service.ts`

Responsibilities:

- Writes append-only rows to `consumer_action_log`.
- Enforces metadata allowlist (`result`, `reason`, `status`, `code`, `currency`, `amountMinor`, `paymentRequestId`, `conversionId`, `ruleId`, `method`, `path`).
- Drops disallowed metadata keys and unsupported value shapes.
- Applies lightweight backpressure for low-priority actions (per-second cap + overflow sampling).
- Always preserves failure and critical money-flow-adjacent action visibility (`withdraw`, `transfer`, `exchange.convert`).
- Swallows DB write errors and logs warning event `consumer_action_log_write_failed` (non-blocking behavior).
- Emits operational events for observability:
  - `consumer_action_log_backpressure_summary` (periodic drop/sample summary)
  - `consumer_action_log_db_pool_saturation_signal` (Prisma timeout-shaped pool pressure signal, `P2024`)

### 5) Database model and migration

- Prisma model: `packages/database-2/prisma/schema.prisma` (`ConsumerActionLogModel`)
- Migration: `packages/database-2/prisma/migrations/20260315041301_add_consumer_action_log/migration.sql`

Table characteristics:

- Append-only monthly-partitioned table (`RANGE created_at`).
- Composite PK `(id, created_at)` for partitioned uniqueness.
- Indexed by `(device_id, created_at)`, `(consumer_id, created_at)`, `(consumer_id, device_id)`, `(action, created_at)`.
- Optional FK from `consumer_id` to `consumer(id)` with `ON DELETE SET NULL`.

Governance exception note:

- Composite PK `(id, created_at)` is intentional for PostgreSQL range partitioning safety: partition-local unique constraints must include the partition key. We keep `id` as UUID and include `created_at` to enforce uniqueness across partitions without cross-partition global-index requirements.

### 6) Partition and retention schedulers

Paths:

- `apps/api-v2/src/consumer/auth/consumer-action-log-partition-maintenance.scheduler.ts`
- `apps/api-v2/src/consumer/auth/consumer-action-log-retention.scheduler.ts`

Responsibilities:

- Pre-create current + upcoming monthly partitions to avoid insert failures during month transitions.
- Enforce retention policy (`30d` by default) in a non-blocking way:
  - Drop fully expired monthly partitions.
  - Run bounded multi-batch boundary-month deletes for rows older than cutoff.
- Swallow DB failures and log warnings (never blocks request handling).

Governance exception note:

- Partition maintenance/retention uses identifier-only dynamic SQL for DDL and partition targeting. This path uses strict identifier quoting and pattern-bounded partition names; no user input is interpolated into raw SQL.

## Request Flow

1. Request enters API and passes `cookie-parser`.
2. `deviceIdMiddleware` resolves/creates browser identity and sets `req.deviceId`.
3. Route handler executes.
4. `ConsumerActionInterceptor` observes result for decorated consumer handlers.
5. Service writes row into `consumer_action_log` (or warns on failure, without interrupting API response).

## Decorated Endpoint Coverage (Current)

### Auth

- `consumer.auth.signup`
- `consumer.auth.login`
- `consumer.auth.oauth_start`
- `consumer.auth.oauth_callback`
- `consumer.auth.oauth_exchange`
- `consumer.auth.me`

### Exchange

- `consumer.exchange.quote`
- `consumer.exchange.convert`

### Payments

- `consumer.payments.start`
- `consumer.payments.withdraw`
- `consumer.payments.transfer`
- `consumer.payments.confirm`
- `consumer.payments.pay_with_saved_method`

### Payment methods

- `consumer.payment_methods.attach`
- `consumer.payment_methods.remove`

### Intentionally not decorated

- `POST /consumer/auth/refresh`
- `POST /consumer/auth/logout`
- `POST /consumer/auth/logout-all`

## Auth/CSRF and OAuth Compatibility

Path: `apps/api-v2/src/consumer/auth/auth.controller.ts`

Behavior preserved:

- CSRF validation remains required for:
  - `POST /consumer/auth/refresh`
  - `POST /consumer/auth/logout`
  - `POST /consumer/auth/logout-all`
- OAuth start/callback/exchange contracts remain intact.
- `oauthToken` exchange semantics remain intact.
- Tracking additions do not alter cookie ownership or session semantics.

## Web and Mobile BFF Compatibility

Paths:

- `apps/consumer-css-grid/src/app/api/consumer/auth/refresh/route.ts`

BFF behavior:

- Forwards allowlisted headers.
- Strips `host`.
- Forwards cookies to backend.
- For auth-protected reads and mutations, forwards the trusted app `Origin` so the backend can resolve the correct cookie scope.
- For refresh, forwards `x-csrf-token` when available.
- Appends backend `Set-Cookie` headers unchanged to response.

## Privacy and Security Notes

- Tracking metadata is allowlisted and minimal.
- IP/user-agent persistence is disabled by default; when enabled, stored values are minimized (masked prefix / normalized family).
- No tokens, passwords, or raw payload dumps are stored by tracking service.
- Logging remains append-only and non-blocking.
- Browser identity remains `deviceId` (no parallel browser identifier introduced).

## Verification Matrix

Current tests covering the contract:

- `apps/api-v2/src/common/middleware/device-id.middleware.spec.ts`
  - deviceId generation, reuse, regeneration after cookie clear, consumer-path scoping
- `apps/api-v2/src/common/interceptors/consumer-action.interceptor.spec.ts`
  - success/failure naming, decorator gating, admin-path no-op
- `apps/api-v2/src/shared/consumer-action-log.service.spec.ts`
  - allowlist sanitization, write-failure safety
- `apps/api-v2/src/consumer/auth/auth.controller.spec.ts`
  - CSRF rejection for refresh/logout/logout-all, legacy `refresh-access` undecorated
- `apps/api-v2/test/consumer-auth-csrf.e2e-spec.ts`
  - CSRF rejection paths and positive CSRF-pair path behavior for refresh

## Operational Checklist (Before Release)

- Run API unit tests and focused e2e for CSRF behavior.
- Confirm migration applied and indexes exist in target DB.
- Confirm partition maintenance/retention cron jobs are running and logging healthy.
- Verify logs show expected action suffixes (`_success`, `_failure`).
- Confirm no admin routes are included in consumer tracking.
- Smoke-test the `consumer-css-grid` OAuth callback flow (`oauthToken` exchange + `/api/me`).
- Release note: OAuth callback now requires both query `state` and OAuth state cookie to be present and matching (`invalid_state` on missing/mismatch).

## Rollout and Runbook

Deploy order:

1. Deploy migration `20260315041301_add_consumer_action_log` (includes FK and a default partition as catch-all safety).
2. Deploy API with partition maintenance + retention schedulers enabled.

OAuth callback compatibility canary (first 24-72h after deploy):

- Track rate of OAuth callback `invalid_state` responses vs successful callback exchanges.
- Alert on sustained `invalid_state` increase above baseline after deploy.
- If elevated and correlated with cookie-loss redirect edges, enable a short, explicitly time-boxed compatibility fallback window and close it after affected clients are remediated.

Rollback policy:

- There is no routine destructive rollback for this rollout.
- `consumer_action_log` is append-only audit history and should not be dropped in normal rollback procedures.
- Practical rollback path is forward-fix:
  - keep the table and existing indexes in place;
  - if migration-side constraints cannot complete safely, stop rollout, tune migration window/timeouts, and retry in a controlled window.

Config knobs (`apps/api-v2/src/envs.ts`):

- `CONSUMER_ACTION_LOG_RETENTION_DAYS` (default `30`)
- `CONSUMER_ACTION_LOG_PARTITION_PRECREATE_MONTHS` (default `2`)
- `CONSUMER_ACTION_LOG_MAINTENANCE_CRON` (default `17 */6 * * *`)
- `CONSUMER_ACTION_LOG_RETENTION_CRON` (default `23 3 * * *`)
- `CONSUMER_ACTION_LOG_BACKPRESSURE_ENABLED` (default `true`)
- `CONSUMER_ACTION_LOG_LOW_PRIORITY_MAX_PER_SECOND` (default `250`)
- `CONSUMER_ACTION_LOG_OVERFLOW_SAMPLE_RATE` (default `0.1`)
- `CONSUMER_ACTION_LOG_BACKPRESSURE_SUMMARY_INTERVAL_SECONDS` (default `60`)
- `CONSUMER_ACTION_LOG_BACKPRESSURE_SUMMARY_MIN_DROPPED` (default `10`)
- `CONSUMER_ACTION_LOG_STORE_IP_ADDRESS` (default `false`; when enabled, only masked prefixes are stored)
- `CONSUMER_ACTION_LOG_STORE_USER_AGENT` (default `false`; when enabled, only normalized browser family/version is stored)

Recommended alert thresholds (starting point):

- Page on 3 consecutive scheduler failure events per job (for example: `exchange_scheduled_conversions_failed`, `exchange_auto_conversion_rules_failed`, `stripe_reversal_reconcile_failed`).
- Warn when scheduler run failure ratio exceeds 20% over a 15-minute window for a given job.
- Trigger heartbeat warning when no scheduler success event is observed for more than 2x expected cadence (for example: >2m for 1-minute jobs, >10m for 5-minute jobs, >20m for 10-minute jobs).
- For audit logging backpressure, warn when `consumer_action_log_backpressure_summary` reports sustained dropped events across 3+ consecutive summaries.

Scheduler alert taxonomy (`apps/api-v2`):

| Job | Success event | Failure event | Throws? |
| --- | --- | --- | --- |
| `OauthStateCleanupScheduler.deleteExpiredOauthState` | `OAuth state cleanup: deleted <count> expired row(s)` (only emitted when count > 0) | `OAuth state cleanup failed (e.g. DB unavailable): <message>` | No (caught) |
| `ConsumerActionLogPartitionMaintenanceScheduler.ensureUpcomingPartitions` | `consumer_action_log partition maintenance ensured: <partitions>` | `consumer_action_log partition maintenance failed: <message>` | No (caught) |
| `ConsumerActionLogRetentionScheduler.enforceRetention` | `consumer_action_log retention run complete: dropped_partitions=<n>, boundary_deleted_rows=<n>` | `consumer_action_log retention failed: <message>` | No (caught) |
| `ConsumerExchangeScheduler.processScheduledConversions` | `exchange_scheduled_conversions_complete` | `exchange_scheduled_conversions_failed` | No (caught) |
| `ConsumerExchangeScheduler.processAutoConversionRules` | `exchange_auto_conversion_rules_complete` | `exchange_auto_conversion_rules_failed` | No (caught) |
| `StripeReversalScheduler.reconcilePendingRefunds` | `stripe_reversal_reconcile_complete` | `stripe_reversal_reconcile_failed` (run-level) and `Failed to reconcile refund` (item-level) | No (caught) |

Manual verification queries:

- List partitions:
  - `SELECT child.relname FROM pg_inherits JOIN pg_class parent ON pg_inherits.inhparent = parent.oid JOIN pg_class child ON pg_inherits.inhrelid = child.oid WHERE parent.relname = 'consumer_action_log' ORDER BY child.relname;`
- Check row spread:
  - `SELECT to_char(created_at, 'YYYY-MM') AS month, count(*) FROM consumer_action_log GROUP BY 1 ORDER BY 1 DESC;`
- Check old rows remain only inside active boundary month:
  - `SELECT count(*) FROM consumer_action_log WHERE created_at < (now() - interval '30 days');`

