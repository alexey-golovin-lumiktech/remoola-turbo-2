# MVP-3.3a Saved Views (skeleton, reconciliation note)

> Status: landed | Phase: MVP-3.3a | Sequence 6 (per 08-rollout-risks-and-sequencing.md) | Builds on: 3.2a

## Scope landed

- First half of remaining MVP-3 exit criterion ("saved views and operational alerts configurable"). Operational alerts deferred to 3.3b.
- One new Prisma model SavedViewModel with one new migration 20260421100000_admin_v2_saved_views_foundation.
- Single new capability `saved_views.manage` (active for OPS_ADMIN and SUPER_ADMIN bridge roles, analogous to consumers.notes personal output capability).
- Three new audit actions: `saved_view_create`, `saved_view_update`, `saved_view_delete` (read and apply are not audit-worthy UX accelerators).
- Three new server actions: `createSavedViewAction`, `updateSavedViewAction`, `deleteSavedViewAction`.
- Four new endpoints under `/api/admin-v2/saved-views/`: list, create, update, delete.
- Single workspace allowlist value (single workspace allowlist): `'ledger_anomalies'` only. Enforced both by DB CHECK constraint and service-level constant (defense in depth).
- personal-only ownership invariant: every read and mutation filtered by owner_id = caller.adminId. Non-owner access returns 404 (NOT 403) to prevent ownership leak.
- soft-delete by default via deleted_at TIMESTAMPTZ; partial unique index (owner_id, workspace, name) WHERE deleted_at IS NULL allows reusing names after deletion.
- opaque queryPayload JSONB with hard 4 KB size limit (MAX_SAVED_VIEW_PAYLOAD_BYTES) enforced both via DB CHECK and service path. Backend never parses payload internals.
- /ledger/anomalies page integrates a Saved views section: apply links built from payload, save-current-view form seeded with active filters, and inline rename/delete per row.
- Frontend graceful fallback when stored payload no longer matches the workspace shape (legacy / corrupted entries → default filters loaded with explanatory message).

## Explicitly out of slice

- Sharing, default-view, pin/favorite, folder, alerts/operational alerts (operational alerts deferred to 3.3b).
- Cross-workspace navigation, cross-admin operations, saved_views.admin_override.
- Per-workspace JSON Schema validation in backend (frontend owns the shape contract).
- Additional workspaces beyond ledger_anomalies (each future workspace requires its own additive allowlist migration + UI integration slice).
- Read pagination, search/filter on list endpoint, and any apply endpoint (frontend constructs URL from payload directly).
- expectedDeletedAtNull is the only optimistic-concurrency primitive; no version integer column added.
- No changes to anomaly cluster, assignments cluster, verification cluster, overview, or system surfaces.

## Decision: workspace allowlist ledger_anomalies only

- ledger_anomalies is the most mature read surface in MVP-3 and the only workspace whose query shape is stable enough to be persisted today.
- Allowlist enforced twice: PostgreSQL CHECK constraint on saved_view.workspace, and a service constant SAVED_VIEW_WORKSPACES = ['ledger_anomalies']. Both layers must agree before a request is accepted.
- Workspace allowlist evolution is intentionally an additive migration step (DROP + ADD CHECK with new values). Each future workspace has its own slice.

## Decision: opaque queryPayload contract

- Backend stores queryPayload as JSONB without any internal parsing or validation.
- Backend constraints are limited to: payload must not be SQL NULL (Prisma JSON column NOT NULL), must be JSON object/array/literal (primitives like raw number/boolean/string are rejected at DTO level), and serialized payload must fit MAX_SAVED_VIEW_PAYLOAD_BYTES (4 KB).
- Workspace handlers (frontend pages) own the payload shape and graceful degradation.
- audit logs never include the payload itself — only payloadBytes count — to keep audit log free of user-controlled opaque content (noise + GDPR concern).

## Decision: personal-only ownership

- Single capability saved_views.manage gates all four endpoints; ownership is enforced inside the service path.
- Non-owner access (read or mutation) returns 404 to prevent leaking the existence of someone else's view; this is consistent with the assignments slice ownership-leak prevention pattern.
- No SUPER_ADMIN override path exists for personal data; future cross-admin tooling would require a separate saved_views.admin_override capability.

## Decision: soft-delete by default

- Delete sets deleted_at = NOW() rather than DROP / DELETE. Audit trail and any references in shared dashboards remain valid post-delete.
- Recreation reuses the same name because the partial unique index excludes soft-deleted rows; no confirmation dialog is required since the operation is trivially reversible via recreate.

## Decision: name unique partial index

- CREATE UNIQUE INDEX idx_saved_view_active_owner_workspace_name ON saved_view(owner_id, workspace, name) WHERE deleted_at IS NULL.
- Race-free uniqueness via Prisma create + P2002 → ConflictException mapping; no application-level pre-check.
- Trade-off: same name may exist as one active row + N soft-deleted rows. Acceptable since soft-deleted rows are invisible to operators.

## Concurrency contract

- expectedDeletedAtNull = 0 in update / delete bodies acts as the optimistic-concurrency proxy ("expected deleted_at = null literal").
- Mutations open a SELECT ... FOR UPDATE on the row inside a transaction, verify ownership, verify deleted_at IS NULL, then apply the update. Any deviation returns 404 (not found / wrong owner) or 409 (already soft-deleted, name conflict).

## Idempotency

- All three mutation endpoints require Idempotency-Key header through AdminV2IdempotencyService with scopes saved-view-create, saved-view-update, saved-view-delete.
- Replay with the same key returns the cached result; replay with a different payload returns 409 per the existing infra contract.

## Reconciles

- Closes the saved-views half of the last remaining MVP-3 exit criterion. Operational alerts (3.3b) build on this slice's payload contract.
- Preserves zero-change invariant for the anomaly cluster (3.1a/3.1b/3.1c) and assignments cluster (3.2a). Both clusters remain frozen.
- Reuses the mutation slice template established in 3.2a (capability + audit + idempotency + version proxy + service-level transaction) for a personal-data CRUD shape; no new platform primitives introduced.
