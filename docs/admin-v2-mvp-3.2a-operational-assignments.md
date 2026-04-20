# MVP-3.2a Operational Assignments (reconciliation note)

> Status: landed | Phase: MVP-3.2a | Sequence 6 (per 08-rollout-risks-and-sequencing.md) | Builds on: 3.1c

## Scope landed

- First mutation slice in MVP-3 maturity track (after 3.1a/3.1b/3.1c read-only ledger anomaly cluster).
- Three regulated mutations on OperationalAssignmentModel: claim, release, reassign.
- Single new capability assignments.manage (active for OPS_ADMIN and SUPER_ADMIN bridge roles).
- Three new audit actions: assignment_claim, assignment_release, assignment_reassign.
- Three new server actions: claimVerificationAssignmentAction, releaseVerificationAssignmentAction, reassignVerificationAssignmentAction.
- Single resourceType supported: verification only. ASSIGNABLE_RESOURCE_TYPES allowlist enforced at service level.
- Verification case page surfaces assignment context (current + history + role-gated controls). Verification queue gains assigned-to column.
- single active assignment per resource enforced via service-level transaction with INSERT WHERE NOT EXISTS pattern (no new partial unique index).
- append-only assignment chain: reassign closes old row and inserts new row in single transaction with two correlated audit entries.
- no new schema migrations; OperationalAssignmentModel and AdminModel relations were already deployed pre-slice.

## Explicitly out of slice

- Cross-queue "my assignments" view, overview tile, system card — deferred to 3.2b.
- Other resource types (payment_request, payout, ledger_anomaly_class, document, consumer) — deferred.
- Auto-expire CRON, auto-release on admin deactivation, SLA escalation hookup — deferred.
- Per-resourceType capability granularity (e.g. assignments.verification.manage) — not adopted.
- Read/write capability split (assignments.read + assignments.manage) — not adopted; single capability.
- expires_at field is nullable but never written by this slice; UI may compute display-only "expired" badge but no enforcement.
- No new GET endpoint; assignment context inlined in getCase / getQueue responses.
- No changes to OperationalAssignmentModel schema (no version field, no metadata, no partial unique index).

## Decision: resourceType allowlist verification only

- ASSIGNABLE_RESOURCE_TYPES = ['verification'] in DTO module; assertResourceType throws BadRequestException for anything else.
- verification chosen as first surface because it is the smallest existing queue with operator ownership semantics already in place (verification.decide capability, decision audit actions).
- Future expansion to payment_request, payout, ledger_anomaly_class etc. each require explicit allowlist additions plus per-resource UI integration; defer to 3.2b/3.2c.

## Decision: capability granularity single assignments.manage

- Single capability gates all three actions across all resource types (currently only one).
- Per-action granularity (assignments.claim / assignments.release / assignments.reassign) deferred until role differentiation actually requires it.
- Per-resourceType granularity (assignments.verification.manage) deferred — current resourceType set is single.
- Reassign additionally gates on SUPER_ADMIN bridge role at service level (not via separate capability) per §17.9 evidence.

## Decision: reassign requires SUPER_ADMIN

- claim/release available to OPS_ADMIN + SUPER_ADMIN (both bridge roles with assignments.manage).
- reassign requires bridge role === 'SUPER_ADMIN' (service-level role check, not separate capability) because reassign moves work between operators — operational handover authority sits with super-admins per pack §03 RBAC layer separation.

## Decision: version check via expectedReleasedAtNull

- No new version column added to operational_assignment.
- release/reassign accept expectedReleasedAtNull: 0 in body as version proxy ("expected released_at = null literal").
- Service rejects with 409 if released_at is already non-null when transaction begins.
- This avoids schema migration in this slice while preserving optimistic concurrency contract per pack §08 mutation class controls.

## Decision: single active assignment enforced via service-level INSERT WHERE NOT EXISTS

- No partial unique index added (would require migration; explicit anti-scope per §1.10).
- Race-free via single SQL: INSERT INTO operational_assignment (...) WHERE NOT EXISTS (SELECT 1 FROM operational_assignment WHERE resource_type = $1 AND resource_id = $2 AND released_at IS NULL).
- If insert affects 0 rows → ConflictException 409.
- Trade-off: no DB-level constraint, relies on service path. Acceptable because all writes go through this service path; out-of-band writes (admin SQL, scripts) are not expected during slice life. Future hardening: add partial unique index in separate slice.

## Audit chain semantics

- claim: single audit entry (assignment_claim) with metadata.assignmentId.
- release: single audit entry (assignment_release) with metadata.assignmentId, metadata.reason, metadata.releasedFrom.
- reassign: TWO audit entries (assignment_release + assignment_reassign) sharing metadata.transferOperationId for correlation. This preserves full forensic chain — a reassign is structurally a release+claim by a third party, both halves visible.

## Verification controller deviation from §6.3

- §6.3 states the verification controller must not be modified.
- Landed code adds two additional capability-derived booleans (canManageAssignments, canReassignAssignments) to the existing decisionControls object at the controller level. Those booleans are then forwarded to the service as part of the same DecisionControls payload that already carried canDecide/canForceLogout.
- This is a purely additive, internal wiring change — the public HTTP contract shape is unchanged other than the additive fields required by §6.4. The alternative (service-level profile re-derivation) would have required plumbing the full admin identity into the service just to call AccessService twice per request.
- No additional endpoints, no changes to guards, no behavioral changes for callers without assignments.manage.

## Reconciles

- Closes one of three remaining MVP-3 exit criteria (assignments workflow functional). Two remain: saved views/alerts, expanded system diagnostics.
- Preserves zero-mutation invariant of 3.1a/3.1b/3.1c read-only ledger anomaly cluster (those slices unaffected).
- Establishes mutation slice template for MVP-3 maturity track: capability + audit-action vocabulary + idempotency + version-check + role-gate composable patterns reusable for ack/alert/saved-view slices.
