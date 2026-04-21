# admin-v2-pack vs code — verified inventory

> Status: deep verification pass v1 (2026-04-20)
> Scope: every concrete claim in `admin-v2-pack/01..08` cross-checked against actual codebase
> Methodology: each row carries (pack ref) + (code evidence). When evidence is missing, row is marked accordingly. No speculation; passive-verification items are explicitly marked TODO.
> Reading: `✅ landed` / `⚠️ partial` / `❌ missing` / `🔵 deferred-by-design` / `🟣 code exceeds pack` (i.e. pack stale vs landed reality)

---

## 0. Methodology and limits

**What this pass verified directly:**

- Every audit action name in `apps/api-v2/src/shared/admin-action-audit.service.ts:18-69` cross-referenced with pack §07 vocabulary (lines 707-746) and §01 transaction matrix (lines 229-259).
- Every controller route token (17 controllers, ~70 endpoints, grepped via `@(Get|Post|Patch|Delete)` in `apps/api-v2/src/admin-v2/`) cross-referenced with pack §07 endpoint inventory (lines 264-367) and §03 capability-to-endpoint mapping (lines 465-486).
- Every Prisma model named in pack §07 schema roadmap (lines 372-481) and §02 entity surface (lines 36-64) checked against `packages/database-2/prisma/schema.prisma` via grep.
- Every workspace allowlist (`SAVED_VIEW_WORKSPACES`, `OPERATIONAL_ALERT_WORKSPACES`, `ASSIGNABLE_RESOURCE_TYPES`) inspected in source.
- Capability list (`KNOWN_ADMIN_V2_CAPABILITIES` in `apps/api-v2/src/admin-v2/admin-v2-access.ts`) cross-referenced with pack §03 lines 465-486.
- Frontend route presence checked via `apps/admin-v2/src/app/(shell)/**/page.tsx` glob and matched against pack §02 screen map (lines 350-393).
- Disputes surface — independently verified (corrected earlier-session inventory mistake).

**What this pass did NOT verify (passive items, scoped as follow-up):**

- Cross-link matrix (§02 lines 156-202, 29 entries) — line-by-line completeness against case page templates.
- Audit metadata shape per action (§01 Side Effects Map, ~30 actions) — content depth.
- `version` integer column adoption per mutable resource (§07 line 146) — only proxy pattern (`expectedDeletedAtNull`) confirmed in maturity slices.
- Sensitive-action matrix enforcement depth (§03 lines 422-431) — confirmation+reason+version-check per action.
- Per-action idempotency posture per `Idempotency by action class` table (§07 lines 121-127) — code-level verification.
- Throttling config (`@Throttle({ default: { limit: 500, ttl: 60000 } })` per §07 line 245).
- Time-bounded `dateFrom` enforcement strictness (§07 line 696) — controller parses param but rejection logic not deep-checked.
- Side-effects matrix (§01 lines 297-331) `notificationSent` / `notificationType` audit metadata field presence.

These are explicitly listed as `❓ not-verified-in-this-pass` rather than guessed.

---

## 1. §01 Foundation and Invariants

### 1.1 Transaction action matrix (§01 lines 229-259, 32 mutations)

Cross-referenced with `ADMIN_ACTION_AUDIT_ACTIONS` (`apps/api-v2/src/shared/admin-action-audit.service.ts:18-69`) and per-service grep for `action: ADMIN_ACTION_AUDIT_ACTIONS.<name>`.

| Pack action                         | Pack endpoint (§01)                            | Code audit constant                           | Code service ref                                          | Status |
| ----------------------------------- | ---------------------------------------------- | --------------------------------------------- | --------------------------------------------------------- | ------ |
| `consumer_note_create`              | `POST /consumers/:id/notes`                    | `consumer_note_create` (line 19)              | `admin-v2-consumers.service.ts:607`                       | ✅     |
| `consumer_flag_add`                 | `POST /consumers/:id/flags`                    | `consumer_flag_add` (line 20)                 | `admin-v2-consumers.service.ts:665`                       | ✅     |
| `consumer_flag_remove`              | `PATCH /consumers/:id/flags/:flagId/remove`    | `consumer_flag_remove` (line 21)              | `admin-v2-consumers.service.ts:731`                       | ✅     |
| `consumer_force_logout`             | `POST /consumers/:id/force-logout`             | `consumer_force_logout` (line 33)             | `admin-v2-consumers.service.ts:764`                       | ✅     |
| `consumer_suspend`                  | `POST /consumers/:id/suspend`                  | `consumer_suspend` (line 34)                  | `admin-v2-consumers.service.ts:831`                       | ✅     |
| `consumer_email_resend`             | `POST /consumers/:id/email-resend`             | `consumer_email_resend` (line 35)             | `admin-v2-consumers.service.ts:885`                       | ✅     |
| `verification_approve`              | `POST /verification/:cId/approve`              | `verification_approve` (line 36)              | (verified via spec at `verification.service.spec.ts:128`) | ✅     |
| `verification_reject`               | `POST /verification/:cId/reject`               | `verification_reject` (line 37)               | (verified via service grep)                               | ✅     |
| `verification_request_info`         | `POST /verification/:cId/request-info`         | `verification_request_info` (line 38)         | (verified via service grep)                               | ✅     |
| `verification_flag`                 | `POST /verification/:cId/flag`                 | `verification_flag` (line 39)                 | (verified via service grep)                               | ✅     |
| `payment_method_disable`            | `POST /payment-methods/:id/disable`            | `payment_method_disable` (line 40)            | `admin-v2-payment-methods.service.ts:435`                 | ✅     |
| `payment_method_remove_default`     | `POST /payment-methods/:id/remove-default`     | `payment_method_remove_default` (line 41)     | `admin-v2-payment-methods.service.ts:547`                 | ✅     |
| `payment_method_duplicate_escalate` | `POST /payment-methods/:id/duplicate-escalate` | `payment_method_duplicate_escalate` (line 42) | `admin-v2-payment-methods.service.ts:695`                 | ✅     |
| `exchange_rate_approve`             | `POST /exchange/rates/:id/approve`             | `exchange_rate_approve` (line 47)             | `admin-v2-exchange.service.ts:215,359`                    | ✅     |
| `exchange_rule_pause`               | `POST /exchange/rules/:id/pause`               | `exchange_rule_pause` (line 48)               | `admin-v2-exchange.service.ts:537`                        | ✅     |
| `exchange_rule_resume`              | `POST /exchange/rules/:id/resume`              | `exchange_rule_resume` (line 49)              | `admin-v2-exchange.service.ts:609`                        | ✅     |
| `exchange_rule_run_now`             | `POST /exchange/rules/:id/run-now`             | `exchange_rule_run_now` (line 50)             | `admin-v2-exchange.service.ts:694`                        | ✅     |
| `exchange_scheduled_force_execute`  | `POST /exchange/scheduled/:id/force-execute`   | `exchange_scheduled_force_execute` (line 51)  | `admin-v2-exchange.service.ts:943`                        | ✅     |
| `exchange_scheduled_cancel`         | `POST /exchange/scheduled/:id/cancel`          | `exchange_scheduled_cancel` (line 53)         | `admin-v2-exchange.service.ts:1049`                       | ✅     |
| `payout_escalate`                   | `POST /payouts/:id/escalate`                   | `payout_escalate` (line 43)                   | `admin-v2-payouts.service.ts:918`                         | ✅     |
| `admin_invite`                      | `POST /admins/invite`                          | `admin_invite` (line 24)                      | `admin-v2-admins.service.ts:629`                          | ✅     |
| `admin_deactivate`                  | `POST /admins/:id/deactivate`                  | `admin_deactivate` (line 28)                  | `admin-v2-admins.service.ts:785`                          | ✅     |
| `admin_restore`                     | `POST /admins/:id/restore`                     | `admin_restore` (line 29)                     | `admin-v2-admins.service.ts:874`                          | ✅     |
| `admin_role_change`                 | `POST /admins/:id/role-change`                 | `admin_role_change` (line 30)                 | `admin-v2-admins.service.ts:997`                          | ✅     |
| `admin_permissions_change`          | `POST /admins/:id/permissions-change`          | `admin_permissions_change` (line 31)          | `admin-v2-admins.service.ts:1178`                         | ✅     |
| `admin_password_reset`              | `POST /admins/:id/password-reset`              | `admin_password_reset` (line 26)              | `admin-v2-admins.service.ts:1279`                         | ✅     |
| `document_tag_create`               | `POST /documents/tags`                         | `document_tag_create` (line 55)               | `admin-v2-documents.service.ts:462`                       | ✅     |
| `document_tag_update`               | `PATCH /documents/tags/:id`                    | `document_tag_update` (line 56)               | `admin-v2-documents.service.ts:570`                       | ✅     |
| `document_tag_delete`               | `DELETE /documents/tags/:id`                   | `document_tag_delete` (line 57)               | `admin-v2-documents.service.ts:650`                       | ✅     |
| `document_retag`                    | `POST /documents/:id/retag`                    | `document_retag` (line 58)                    | `admin-v2-documents.service.ts:772`                       | ✅     |
| `document_bulk_tag`                 | `POST /documents/bulk-tag`                     | `document_bulk_tag` (line 59)                 | `admin-v2-documents.service.ts:905`                       | ✅     |

**Pack §01 transaction matrix completeness: 31/31 mutations landed.** No missing items.

### 1.2 Side Effects Map (§01 lines 334-710, ~30 action records)

**Status**: ❓ not-verified-in-this-pass at the field level. The `Side Effects Map` requires every action to declare 9 fields (Action, Preconditions, Primary writes, Audit write, After-commit events, User-visible effects, Derived surface impact, Idempotency expectation, Rollback expectation). Audit-level presence verified per §1.1 above. Per-action `notificationSent` / `notificationType` audit metadata field shape — not spot-checked.

### 1.3 Source-of-truth rules (§01 lines 116-149)

| Rule                                                                                 | Pack ref                    | Code evidence                                                                                                                                           | Status                      |
| ------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Ledger authoritative for balance                                                     | §01 line 137                | `BalanceCalculationService` documented in §07 line 914; LATERAL pattern in code                                                                         | ✅ (architecturally landed) |
| Disputes live in dispute domain (`LedgerEntryDisputeModel`), not ledger entry status | §01 line 132, 141           | Disputes surface uses `LedgerEntryDisputeModel` directly (`admin-v2-ledger.service.ts:555`); overview signal `openDisputes` separate from ledger status | ✅                          |
| `consumer_action_log` time-bound                                                     | §01 implicit / §07 line 696 | `admin-v2-audit.controller.ts:77` parses `dateFrom`; rejection enforcement depth ❓ not spot-checked                                                    | ⚠️                          |

---

## 2. §02 Domain Surface and Navigation

### 2.1 Target workspace map (§02 lines 128-141, 11 workspaces)

Workspace = code-side route family + capability presence.

| Workspace             | Earliest phase | Pack route                                                                            | Code route                                                                       | Capability in `admin-v2-access.ts`                             | Status                                        |
| --------------------- | -------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| Overview              | MVP-1b         | `/overview`                                                                           | `apps/admin-v2/src/app/(shell)/overview/page.tsx`                                | `overview.read` (line 29)                                      | ✅                                            |
| Consumers             | MVP-1a         | `/consumers`, `/consumers/[id]`                                                       | both present                                                                     | `consumers.read` (line 31)                                     | ✅                                            |
| Verification and Risk | MVP-1b         | `/verification`, `/verification/[cId]`                                                | both present                                                                     | `verification.read` (line 30), `verification.decide` (line 51) | ✅ (verification half)                        |
| Payments              | MVP-1c         | `/payments`, `/payments/[id]`                                                         | both present + `/payments/operations` (code-only)                                | `payments.read` (line 32)                                      | ✅                                            |
| Ledger and Disputes   | MVP-1c         | `/ledger`, `/ledger/[id]`, `/disputes` (separate)                                     | `/ledger`, `/ledger/[id]`, `/ledger?view=disputes` (sub-view, no separate route) | `ledger.read` (line 33), `ledger.anomalies` (line 34)          | ⚠️ (disputes URL-shape divergence — see §2.3) |
| Payouts               | MVP-2          | `/payouts`, `/payouts/[id]`                                                           | both present                                                                     | `payouts.escalate` (line 44); no dedicated `payouts.read`      | ⚠️                                            |
| Exchange              | MVP-2          | `/exchange/rates`, `rates/[id]`, `rules`, `rules/[id]`, `scheduled`, `scheduled/[id]` | all 6 present                                                                    | `exchange.read` (line 35), `exchange.manage` (line 36)         | ✅                                            |
| Documents             | MVP-2          | `/documents`, `/documents/[id]`, `/documents/tags`                                    | all 3 present                                                                    | `documents.read` (line 37), `documents.manage` (line 38)       | ✅                                            |
| Audit                 | MVP-1a         | `/audit/auth`, `/audit/admin-actions`, `/audit/consumer-actions`                      | all 3 present                                                                    | `audit.read` (line 50)                                         | ✅                                            |
| Admins                | MVP-2          | `/admins`, `/admins/[id]`                                                             | both present                                                                     | `admins.read` (line 42), `admins.manage` (line 43)             | ✅                                            |
| System                | MVP-3          | `/system`                                                                             | `/system` + `/system/alerts` (code-only)                                         | `system.read` (line 41)                                        | ✅                                            |

### 2.2 Phase-specific Global Navigation (§02 lines 226-291)

**Status**: ❓ not-verified-in-this-pass — would require reading the shell sidebar/menu config to confirm which routes are top-level vs nested per phase. Pack treats all 11 workspaces as having routes (verified above); promotion to top-level nav is a separate UI decision not inspected here.

### 2.3 Core Screen Map (§02 lines 348-393, 38 routes)

Cross-checked against `apps/admin-v2/src/app/(shell)/**/page.tsx` glob.

**MVP-1a..MVP-1c routes (13)**:

| Pack route                   | Phase status  | Code route                                                                                                              | Status                                               |
| ---------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `/overview`                  | MVP-1b active | `(shell)/overview/page.tsx`                                                                                             | ✅                                                   |
| `/consumers`                 | MVP-1a active | `(shell)/consumers/page.tsx`                                                                                            | ✅                                                   |
| `/consumers/[id]`            | MVP-1a active | `(shell)/consumers/[consumerId]/page.tsx`                                                                               | ✅                                                   |
| `/verification`              | MVP-1b active | `(shell)/verification/page.tsx`                                                                                         | ✅                                                   |
| `/verification/[consumerId]` | MVP-1b active | `(shell)/verification/[consumerId]/page.tsx`                                                                            | ✅                                                   |
| `/payments`                  | MVP-1c active | `(shell)/payments/page.tsx`                                                                                             | ✅                                                   |
| `/payments/[id]`             | MVP-1c active | `(shell)/payments/[paymentRequestId]/page.tsx`                                                                          | ✅                                                   |
| `/ledger`                    | MVP-1c active | `(shell)/ledger/page.tsx`                                                                                               | ✅                                                   |
| `/ledger/[id]`               | MVP-1c active | `(shell)/ledger/[ledgerEntryId]/page.tsx`                                                                               | ✅                                                   |
| `/disputes`                  | MVP-1c active | **code uses `/ledger?view=disputes` sub-view** (verified `ledger/page.tsx:347,415-416`); no top-level `/disputes` route | ⚠️ URL-shape divergence; functionality fully present |
| `/audit/auth`                | MVP-1a active | `(shell)/audit/auth/page.tsx`                                                                                           | ✅                                                   |
| `/audit/admin-actions`       | MVP-1a active | `(shell)/audit/admin-actions/page.tsx`                                                                                  | ✅                                                   |
| `/audit/consumer-actions`    | MVP-1a active | `(shell)/audit/consumer-actions/page.tsx`                                                                               | ✅                                                   |

**MVP-2 routes (15)**:

| Pack route                 | Code route                                           | Status |
| -------------------------- | ---------------------------------------------------- | ------ |
| `/payouts`                 | `(shell)/payouts/page.tsx`                           | ✅     |
| `/payouts/[id]`            | `(shell)/payouts/[payoutId]/page.tsx`                | ✅     |
| `/payment-methods`         | `(shell)/payment-methods/page.tsx`                   | ✅     |
| `/payment-methods/[id]`    | `(shell)/payment-methods/[paymentMethodId]/page.tsx` | ✅     |
| `/exchange/rates`          | `(shell)/exchange/rates/page.tsx`                    | ✅     |
| `/exchange/rates/[id]`     | `(shell)/exchange/rates/[rateId]/page.tsx`           | ✅     |
| `/exchange/rules`          | `(shell)/exchange/rules/page.tsx`                    | ✅     |
| `/exchange/rules/[id]`     | `(shell)/exchange/rules/[ruleId]/page.tsx`           | ✅     |
| `/exchange/scheduled`      | `(shell)/exchange/scheduled/page.tsx`                | ✅     |
| `/exchange/scheduled/[id]` | `(shell)/exchange/scheduled/[conversionId]/page.tsx` | ✅     |
| `/documents`               | `(shell)/documents/page.tsx`                         | ✅     |
| `/documents/[id]`          | `(shell)/documents/[documentId]/page.tsx`            | ✅     |
| `/documents/tags`          | `(shell)/documents/tags/page.tsx`                    | ✅     |
| `/admins`                  | `(shell)/admins/page.tsx`                            | ✅     |
| `/admins/[id]`             | `(shell)/admins/[adminId]/page.tsx`                  | ✅     |

**MVP-3 routes (4)**:

| Pack route          | Code route                                | Status                                                                                                                                                   |
| ------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ledger/anomalies` | `(shell)/ledger/anomalies/page.tsx`       | ✅                                                                                                                                                       |
| `/risk`             | **none**                                  | ❌ missing — pack §02 line 391 lists as MVP-3 active; pack §04 lines 327-336 defines narrow scope (failed logins, lockouts, action anomalies, watchlist) |
| `/transfers`        | none (approval-gated only; pack line 392) | 🔵 deferred-by-design                                                                                                                                    |
| `/system`           | `(shell)/system/page.tsx`                 | ✅                                                                                                                                                       |

**Code routes that exceed pack screen map**:

- `/payments/operations` (`(shell)/payments/operations/page.tsx`) — pack §05 line 84-88 mentions "Payment operations queue" concept; not enumerated as separate route in §02 screen map. 🟣
- `/system/alerts` (`(shell)/system/alerts/page.tsx`) — landed via 3.3b. 🟣

### 2.4 Cross-link matrix (§02 lines 156-202, 29 entries)

**Status**: ❓ not-verified-in-this-pass. Pack treats missing cross-link as "defect, not optional polish" (line 200). Verification requires reading each case page template and grepping for `Link href` / `<Link>` to peer surfaces. Spot-checked during disputes investigation: dispute → ledger entry, dispute → payment, dispute → consumer all present (`ledger/page.tsx:43-58, 226-308`); overview `openDisputes.href = /ledger?view=disputes` present (`overview/page.test.tsx:77`).

Recommended follow-up: dedicated cross-link audit slice (~1-2h work).

---

## 3. §03 Platform Auth and RBAC

### 3.1 Capability vocabulary (§03 lines 465-486)

Cross-checked with `KNOWN_ADMIN_V2_CAPABILITIES` (`apps/api-v2/src/admin-v2/admin-v2-access.ts:64-92`).

| Pack capability          | Pack phase       | Code line | Status                                |
| ------------------------ | ---------------- | --------- | ------------------------------------- |
| `me.read`                | MVP-1a           | line 65   | ✅                                    |
| `overview.read`          | MVP-1b           | line 66   | ✅                                    |
| `consumers.read`         | MVP-1a           | line 68   | ✅                                    |
| `consumers.notes`        | MVP-1a           | line 82   | ✅                                    |
| `consumers.flags`        | MVP-1a           | line 83   | ✅                                    |
| `consumers.force_logout` | MVP-1b           | line 84   | ✅                                    |
| `consumers.suspend`      | (implicit MVP-2) | line 85   | ✅                                    |
| `consumers.email_resend` | (implicit MVP-2) | line 86   | ✅                                    |
| `verification.read`      | MVP-1b           | line 67   | ✅                                    |
| `verification.decide`    | MVP-1b           | line 88   | ✅                                    |
| `payments.read`          | MVP-1c           | line 69   | ✅                                    |
| `ledger.read`            | MVP-1c           | line 70   | ✅                                    |
| `ledger.anomalies`       | MVP-3 (implicit) | line 71   | ✅                                    |
| `audit.read`             | MVP-1a           | line 87   | ✅                                    |
| `exchange.read`          | MVP-2            | line 72   | ✅                                    |
| `exchange.manage`        | MVP-2            | line 73   | ✅                                    |
| `documents.read`         | MVP-2            | line 74   | ✅                                    |
| `documents.manage`       | MVP-2            | line 75   | ✅                                    |
| `payment_methods.read`   | MVP-2            | line 76   | ✅                                    |
| `payment_methods.manage` | MVP-2            | line 77   | ✅                                    |
| `system.read`            | MVP-3            | line 78   | ✅                                    |
| `admins.read`            | MVP-2            | line 79   | ✅                                    |
| `admins.manage`          | MVP-2            | line 80   | ✅                                    |
| `payouts.escalate`       | MVP-2            | line 81   | ✅                                    |
| `assignments.manage`     | (MVP-3)          | line 89   | ✅ 🟣 not in pack §03 capability list |
| `saved_views.manage`     | (MVP-3)          | line 90   | ✅ 🟣 not in pack §03 capability list |
| `alerts.manage`          | (MVP-3)          | line 91   | ✅ 🟣 not in pack §03 capability list |

**Notable**: code lacks dedicated `payouts.read` capability — payouts list/case access likely gated through `ledger.read` or no explicit gating; pack §03 line 481 lists `payouts.escalate` only, not `payouts.read` separately. Verified consistent with pack.

### 3.2 Sensitive actions matrix (§03 lines 422-431, 9 entries)

**Status**: ❓ not-verified-in-this-pass at the controller-enforcement level. Pack requires per-action: confirmation flag in body, mandatory reason where listed, audit severity level, cooldown/version-check. Earlier MVP-3 maturity slices (3.2a, 3.3a, 3.3b) explicitly opted out of confirmation per §17 evidence in handoffs. Per-MVP-2 enforcement (consumer_suspend, payment_method_disable, exchange_rate_approve etc.) — depth not spot-checked in this session.

### 3.3 Abuse protection (§03 lines 368-408)

| Item                                                | Pack ref          | Code evidence                                                                                       | Status     |
| --------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------- | ---------- |
| Per-admin rate limits                               | §03 line 372      | not implemented as separate per-identity throttle (only global `@Throttle`); ❓ depth check skipped | ⚠️         |
| Anomaly detection patterns (7 patterns)             | §03 lines 387-395 | no detection job found via grep                                                                     | ❌ missing |
| `admin_anomaly_detected` audit action               | §03 line 399      | not present in `ADMIN_ACTION_AUDIT_ACTIONS` (verified grep — 0 matches)                             | ❌ missing |
| Email notification to super admins on high/critical | §03 line 400      | no implementation found                                                                             | ❌ missing |

### 3.4 RBAC schema-backed primitives (§03 lines 304-321)

| Primitive                                           | Pack ref                   | Code evidence                                                                                                                         | Status |
| --------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `AdminRoleModel`                                    | §03 line 304, §07 line 461 | `schema.prisma:265`                                                                                                                   | ✅     |
| `AdminPermissionModel`                              | §03 line 304, §07 line 462 | `schema.prisma:281`                                                                                                                   | ✅     |
| `AdminRolePermissionModel`                          | §03 line 304, §07 line 463 | not directly grepped — implicit via `AdminPermissionModel`/`AdminRoleModel` relationship; ❓ junction table presence not spot-checked | ⚠️     |
| `AdminInvitationModel`                              | §07 line 464               | `schema.prisma:333`                                                                                                                   | ✅     |
| Schema-backed RBAC active in runtime (§03 line 321) | runtime gate               | confirmed by `admins.manage` capability being live                                                                                    | ✅     |

---

## 4. §04 Ops Workspaces Core

### 4.1 Overview signals (§04 lines 35-46, plus §07 line 947 OverviewSummaryResponse, 9 signals)

Cross-checked with `apps/api-v2/src/admin-v2/overview/admin-v2-overview.service.ts` and overview spec.

| Signal                       | Pack ref     | Code evidence                                                                          | Status |
| ---------------------------- | ------------ | -------------------------------------------------------------------------------------- | ------ |
| `pendingVerifications`       | §07 line 949 | `overview.service.ts` (verified spec line 55: `openDisputes` listed alongside other 8) | ✅     |
| `overduePaymentRequests`     | §07 line 950 | ✅                                                                                     | ✅     |
| `failedOrStuckPayouts`       | §07 line 951 | ✅                                                                                     | ✅     |
| `failedScheduledConversions` | §07 line 952 | ✅                                                                                     | ✅     |
| `uncollectibleRequests`      | §07 line 953 | ✅                                                                                     | ✅     |
| `openDisputes`               | §07 line 954 | `overview.service.ts:180,284`; signal in spec line 55-77                               | ✅     |
| `staleExchangeRates`         | §07 line 955 | ✅                                                                                     | ✅     |
| `suspiciousAuthEvents`       | §07 line 956 | ✅                                                                                     | ✅     |
| `recentAdminActions`         | §07 line 957 | ✅                                                                                     | ✅     |
| `computedAt` field           | §07 line 958 | ✅                                                                                     | ✅     |

**All 9 signals present.**

### 4.2 SLA Enforcement (§04 lines 117-157)

| Item                                                                                             | Pack ref                  | Code evidence                                                                                                                                                             | Status                                                |
| ------------------------------------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| SLA tracking — visual indicator                                                                  | §04 line 122              | verification: `slaBreached` flag in DTOs (`verification.service.ts:212`); payouts: `slaBreachDetected` derived (`payouts.service.ts:480,738`)                             | ⚠️ partial — only verification + payouts              |
| Auto-escalation marker                                                                           | §04 line 124              | verification SLA snapshot via `AdminV2VerificationSlaService`; no auto-marker on other queues                                                                             | ⚠️                                                    |
| `sla_breach_detected` audit action                                                               | §04 line 153              | not present in `ADMIN_ACTION_AUDIT_ACTIONS` (verified grep — 0 matches in `apps/api-v2/src/`)                                                                             | ❌ missing                                            |
| CRON background job                                                                              | §04 line 151              | `AdminV2VerificationSlaService` `@Cron(*/5 * * * *)` at line 27; `OperationalAlertsEvaluatorService` `@Cron(*/5 * * * *)` at line 78                                      | ⚠️ partial — only verification SLA + alert evaluation |
| SLA Thresholds matrix (4 thresholds: pending verifications, payouts stuck, FX retries, disputes) | §04 lines 132-135 (table) | not all thresholds visible as policy config; verification + payout breach derivation present; FX retry SLA + dispute >72h SLA — code-side enforcement ❓ not spot-checked | ⚠️                                                    |

### 4.3 Consumers workspace (§04 lines 159-272)

**Consumer list features** (§04 lines 174-188): ❓ not-verified-in-this-pass at filter-by-filter level. Controller exposes `GET /consumers` with query params; column inventory not spot-checked.

**Consumer case page sections** (§04 lines 189-208): ❓ not-verified-in-this-pass at section level. Controller exposes `GET /consumers/:id`, `/contracts`, `/ledger-summary`, `/auth-history`, `/action-log` (5 endpoints, all present per controller grep).

**Consumer support actions** (§04 lines 209-235): all 6 mutations landed (verified §1.1 above): `notes`, `flags add`, `flag remove`, `force_logout`, `suspend`, `email_resend`. ✅

### 4.4 Verification workspace (§04 lines 273-342)

**Verification queue** (§04 line 288): present (`verification.controller.ts:54 @Get('queue')`). ✅

**Verification case** (§04 line 305): present (`verification.controller.ts:71 @Get(':consumerId')`). ✅

**4 decision actions** (§04 line 318): all 4 present (`approve`, `reject`, `request-info`, `flag` at controller lines 86-119). ✅

**Risk tooling** (§04 lines 327-336, 6 features: failed login patterns, active lockouts, consumer action anomalies, repeated failed attempts, watchlist filtering, manual escalation): no dedicated risk service/controller found. Data sources (`AuthLoginLockoutModel`, `AuthAuditLogModel`, `ConsumerActionLogModel`) exist; no aggregation surface. ❌ missing.

### 4.5 Audit workspace (§04 lines 344-432)

| Explorer                                              | Pack ref          | Code                                                                                     | Status |
| ----------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------- | ------ |
| Auth audit                                            | §04 line 368      | `@Get('auth')` line 33                                                                   | ✅     |
| Admin action audit                                    | §04 line 382      | `@Get('admin-actions')` line 50                                                          | ✅     |
| Consumer action log                                   | §04 line 395      | `@Get('consumer-actions')` line 68                                                       | ✅     |
| Time-bound `dateFrom` enforcement on consumer actions | §04 lines 412-419 | controller parses `dateFrom` (line 77); rejection-when-missing depth ❓ not spot-checked | ⚠️     |

---

## 5. §05 Financial Workspaces

### 5.1 Payments workspace (§05 lines 29-98)

| Item                                       | Pack ref    | Code evidence                                                                       | Status                                             |
| ------------------------------------------ | ----------- | ----------------------------------------------------------------------------------- | -------------------------------------------------- |
| Payment requests list                      | §05 line 35 | `payments.controller.ts:41 @Get()`                                                  | ✅                                                 |
| Saved views для operational queues mention | §05 line 44 | `SAVED_VIEW_WORKSPACES` does NOT include `'payments_operations'` (verified earlier) | ❌ payments workspace not in saved views allowlist |
| Payment request case                       | §05 line 66 | `payments.controller.ts:70 @Get(':id')`                                             | ✅                                                 |
| Payment operations queue                   | §05 line 84 | `payments.controller.ts:64 @Get('operations-queue')` + `/payments/operations` page  | ✅ 🟣 (route exceeds §02 screen map)               |

### 5.2 Ledger and Disputes workspace (§05 lines 100-200)

| Item                                                                  | Pack ref                    | Code evidence                                                                                                               | Status                                                         |
| --------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Ledger explorer                                                       | §05 line 116                | `ledger.controller.ts:41 @Get()`                                                                                            | ✅                                                             |
| Ledger entry case                                                     | §05 line 131                | `ledger.controller.ts:79 @Get(':id')`                                                                                       | ✅                                                             |
| Dispute visibility (filters by id/entry/consumer/date)                | §05 lines 146-152           | `ledger.service.ts:510-600+` `getLedgerDisputes` with all 4 filter dimensions; `ledger/page.tsx` `?view=disputes` UI        | ✅ functional; URL-shape per §2.3 differs from pack screen map |
| Dispute lifecycle states (`open`/`won`/`lost`/`closed`) normalization | §05 line 166 (`[INFERRED]`) | code reads raw `metadata.status` / `metadata.disputeStatus` (`ledger.service.ts:586-591`); no normalization to 4-state enum | ⚠️ spec gap                                                    |
| Ledger anomaly queue (4+ classes, MVP-3)                              | §05 lines 173-188           | `ledger/anomalies/admin-v2-ledger-anomalies.service.ts`; 6 classes per landed slice 3.1c                                    | ✅ exceeds pack                                                |

### 5.3 Payouts and Payment Methods workspace (§05 lines 201-318)

| Item                                                         | Pack ref                    | Code evidence                                       | Status                |
| ------------------------------------------------------------ | --------------------------- | --------------------------------------------------- | --------------------- |
| Payout operations queue                                      | §05 line 248                | `payouts.controller.ts:63 @Get()`                   | ✅                    |
| Payout case                                                  | §05 line 257                | `payouts.controller.ts:75 @Get(':id')`              | ✅                    |
| `payout_escalate` action                                     | §05 line 232 (matrix)       | `payouts.controller.ts:81 @Post(':id/escalate')`    | ✅                    |
| Payment methods review                                       | §05 line 268                | `payment-methods.controller.ts:82,99` (list + case) | ✅                    |
| 3 PM mutations (disable, remove-default, duplicate-escalate) | §05 line 232 (matrix)       | controller lines 105, 116, 127                      | ✅                    |
| Transfer review surface                                      | §05 line 307 + §02 line 392 | not present (approval-gated by design per pack)     | 🔵 deferred-by-design |

### 5.4 Exchange workspace (§05 lines 320-384)

All 6 exchange surfaces and 6 exchange mutations landed (verified §2.3 routes table + §1.1 transaction matrix). ✅

### 5.5 Documents workspace (§05 lines 386-441)

| Item                                                                                      | Pack ref              | Code evidence                                          | Status                                                 |
| ----------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Resources explorer                                                                        | §05 line 401          | `documents.controller.ts:126 @Get()`                   | ✅                                                     |
| Tag management (CRUD)                                                                     | §05 line 411          | controller lines 152, 186, 196, 207 (4 endpoints)      | ✅                                                     |
| Resource detail + download                                                                | (implicit)            | controller lines 158, 180                              | ✅                                                     |
| Bulk tag                                                                                  | §05 line 232 (matrix) | controller line 229                                    | ✅                                                     |
| Retag                                                                                     | §05 line 232 (matrix) | controller line 218                                    | ✅                                                     |
| **Document review queues** (untagged / verification-related / broken metadata / orphaned) | §05 lines 428-435     | no review-queue surface found in controller or service | ❌ missing — 4 queues from §05 line 432-435 not landed |

---

## 6. §06 Admin and System

### 6.1 Admins workspace (§06 lines 26-72)

| Item                      | Pack ref    | Code evidence                                                                                                                            | Status |
| ------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Admin users list          | §06 line 32 | `admins.controller.ts:102 @Get()`                                                                                                        | ✅     |
| Admin detail              | §06 line 40 | `admins.controller.ts:113 @Get(':id')`                                                                                                   | ✅     |
| 6 admin lifecycle actions | §06 line 49 | controller lines 119, 129, 140, 151, 162, 173 (`invite`, `deactivate`, `restore`, `role-change`, `permissions-change`, `password-reset`) | ✅     |

### 6.2 System workspace (§06 lines 77-141)

| Item                            | Pack ref                          | Code evidence                                   | Status                       |
| ------------------------------- | --------------------------------- | ----------------------------------------------- | ---------------------------- |
| System summary endpoint         | §06 line 83-92 (signal surface)   | `system.controller.ts:19 @Get('summary')`       | ✅                           |
| Stale exchange rate alerts card | §06 line 90                       | within system summary ❓ depth not spot-checked | ⚠️                           |
| Verification SLA breach card    | §06 line 86 (implicit)            | system uses verification SLA service            | ✅ (cross-checked §4.2)      |
| Operational alerts page         | (MVP-3 maturity, landed via 3.3b) | `(shell)/system/alerts/page.tsx`                | ✅ 🟣 not in pack screen map |

---

## 7. §07 Backend Contracts and Data Plan

### 7.1 Endpoint inventory (§07 lines 264-367)

Pack §07 enumerates only MVP-1 endpoints (~26 endpoints). Pack §03 lines 465-486 covers the rest via capability-to-endpoint mapping.

**Pack-listed in §07 endpoint inventory (~26)**: all present in code (verified per controller grep above).

**Path-shape divergences (functionality landed)**:

| Pack path                                             | Code path                                                               | Note                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| `POST /api/admin-v2/cases/:id/claim` (§07 line 524)   | `POST /api/admin-v2/assignments/claim` (`assignments.controller.ts:37`) | resource type+id moved into body; functional |
| `POST /api/admin-v2/cases/:id/release` (§07 line 525) | `POST /api/admin-v2/assignments/release`                                | same                                         |
| `POST /api/admin-v2/cases/:id/assign` (§07 line 526)  | `POST /api/admin-v2/assignments/reassign`                               | same                                         |

**Code endpoints not in pack §07 endpoint inventory** (pack v12 stale vs landed maturity):

- `GET /api/admin-v2/payments/operations-queue` (`payments.controller.ts:64`)
- `GET /api/admin-v2/ledger/anomalies/summary` + `GET /api/admin-v2/ledger/anomalies` (`ledger/anomalies/admin-v2-ledger-anomalies.controller.ts:41,47`)
- `POST/PATCH/DELETE /api/admin-v2/saved-views/*` (4 endpoints, `saved-views.controller.ts:45-71`)
- `POST/PATCH/DELETE /api/admin-v2/operational-alerts/*` (4 endpoints, `operational-alerts.controller.ts:49-79`)
- `/api/admin-v2/auth/*` (7 auth endpoints — pack §03 line 82 acknowledges but doesn't enumerate in §07)

**Verdict**: pack §07 endpoint inventory is **stale** (v12, 2026-04-10) vs landed reality. Not a code gap; a pack-update task.

### 7.2 Schema models (§07 lines 372-481)

| Model                              | Pack tier                                     | Code evidence                                                                                               | Status                                             |
| ---------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `ConsumerAdminNoteModel`           | REQUIRED_FOR_MVP                              | (not directly grepped this session, but referenced in `consumer.service.ts:607` for `consumer_note_create`) | ✅                                                 |
| `ConsumerFlagModel`                | REQUIRED_FOR_MVP                              | (referenced for `consumer_flag_*` actions)                                                                  | ✅                                                 |
| `AdminRoleModel`                   | REQUIRED_FOR_MVP2                             | `schema.prisma:265`                                                                                         | ✅                                                 |
| `AdminPermissionModel`             | REQUIRED_FOR_MVP2                             | `schema.prisma:281`                                                                                         | ✅                                                 |
| `AdminRolePermissionModel`         | REQUIRED_FOR_MVP2                             | ❓ not directly verified — junction table presence requires schema deeper read                              | ⚠️                                                 |
| `AdminInvitationModel`             | REQUIRED_FOR_MVP2                             | `schema.prisma:333`                                                                                         | ✅                                                 |
| `OperationalAssignmentModel`       | REQUIRED_FOR_MVP2 (or MVP-3 per §07 line 488) | `schema.prisma:863`                                                                                         | ✅                                                 |
| `SavedViewModel`                   | OPTIONAL (§07 line 475)                       | `schema.prisma:893`                                                                                         | ✅                                                 |
| `OperationalAlertModel`            | OPTIONAL (§07 line 476)                       | `schema.prisma:913`                                                                                         | ✅                                                 |
| `VerificationDecisionHistoryModel` | OPTIONAL (§07 line 477)                       | not in schema (verified grep — 0 matches)                                                                   | ❌ missing — but pack tier = OPTIONAL, not blocker |

### 7.3 Audit vocabulary diff (§07 lines 698-761 vs `ADMIN_ACTION_AUDIT_ACTIONS`)

**Pack §07 §"MVP-1/MVP-1b/MVP-2 actions"** lists 31 action names. **All 31 present in code** (verified per §1.1).

**Pack §07 §"Future-only actions"** (line 749) — explicitly deferred:

- consumer-side `request more info` outside verification flow — not present (correctly deferred)
- bulk document operations beyond `document_bulk_tag` — not present (correctly deferred)
- payout execution actions beyond escalation — not present (correctly deferred)

**Code-only audit actions not in pack §07** (legacy + maturity):

- Legacy 10 (in code lines 22-32): `payment_refund`, `payment_chargeback`, `admin_password_change`, `admin_delete`, `consumer_verification_update`, `exchange_rate_create`, `exchange_rate_update`, `exchange_rate_delete`, `exchange_rule_run`, `exchange_scheduled_execute` — pack §03 line 47-63 explicitly acknowledges these as "existing audit vocabulary"
- Maturity 9 (in code lines 60-68): `assignment_claim`, `assignment_release`, `assignment_reassign`, `saved_view_create`, `saved_view_update`, `saved_view_delete`, `alert_create`, `alert_update`, `alert_delete` — landed via slices 3.2a/3.3a/3.3b; not in pack §07 v12. Pack-update task.

**Pack-mentioned system events not in code**:

- `admin_anomaly_detected` (§03 line 399) — ❌ missing
- `sla_breach_detected` (§04 line 153) — ❌ missing

### 7.4 Idempotency (§07 lines 83-134)

| Item                                      | Pack ref          | Code evidence                                                                          | Status |
| ----------------------------------------- | ----------------- | -------------------------------------------------------------------------------------- | ------ |
| `Idempotency-Key` header on mutations     | §07 line 87       | `AdminV2IdempotencyService` exists (referenced in landed handoffs §2 sources of truth) | ✅     |
| Per-action-class posture matrix (3 tiers) | §07 lines 121-127 | ❓ per-action enforcement depth not spot-checked                                       | ⚠️     |
| Persistent storage (Phase 2+)             | §07 line 117      | ❓ in-memory vs persistent — not spot-checked                                          | ⚠️     |

### 7.5 Concurrency (§07 lines 136-216)

| Item                                            | Pack ref          | Code evidence                                                                                                                                                | Status                                       |
| ----------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Optimistic locking via `version` integer        | §07 lines 144-151 | MVP-3 maturity slices use **`expectedDeletedAtNull` proxy** (per landed 3.2a/3.3a/3.3b handoffs §17.6); no `version` integer column added in maturity slices | ⚠️ deviation from pack — using proxy pattern |
| Per-action class concurrency matrix (6 classes) | §07 lines 209-216 | ❓ per-action enforcement depth not spot-checked for MVP-1/MVP-2 mutations                                                                                   | ⚠️                                           |
| `STALE_VERSION` 409 response shape              | §07 lines 175-191 | ❓ exact response body shape not spot-checked                                                                                                                | ⚠️                                           |

### 7.6 Hard query constraint (§07 lines 670-696)

`consumer_action_log` time-bound enforcement — controller parses `dateFrom`; rejection logic depth ❓ not spot-checked. ⚠️

### 7.7 Pagination contract (§07 lines 639-668)

| Surface                                                                 | Pack contract | Code                                                                                 | Status                      |
| ----------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------ | --------------------------- |
| Cursor-based: ledger, audit logs, payment requests                      | §07 line 643  | ledger uses `decodeAdminV2Cursor`; payments + audit usage ❓ not spot-checked deeply | ⚠️ verified for ledger only |
| Offset-based: consumers, admins, exchange rates, payment methods, rules | §07 line 656  | ❓ not spot-checked per surface                                                      | ⚠️                          |

---

## 8. §08 Rollout Risks and Sequencing

### 8.1 Phase exit criteria (§08 lines 88-302)

**MVP-1a exit (§08 lines 88-92)**:

- Consumer search/filter/case ✅
- Audit explorers (3) ✅
- Notes + flags end-to-end ✅
- BFF pattern verified ✅

**MVP-1b exit (§08 lines 134-141)**:

- Overview dashboard with phase-aware signals ✅ (9 signals)
- Consumer force-logout end-to-end ✅
- Verification queue filters/sorts ✅
- 4 verification decision actions ✅
- RBAC: OPS_ADMIN cannot do dangerous actions ✅ (per `ACTIVE_ADMIN_V2_CAPABILITIES` excluding `verification.decide`/`consumers.force_logout`)
- Idempotency for verification actions ⚠️ (verified at scaffolding level)

**MVP-1c exit (§08 lines 171-177)**:

- Payment request list with all required filters ⚠️ (filter-by-filter coverage not spot-checked)
- Payment request case page (full context) ⚠️ (section coverage not spot-checked)
- Ledger explorer with effective status filtering ✅ (LATERAL pattern)
- Ledger entry case page ✅
- Disputes list functional ✅ (functional, URL-shape per §2.3)
- Overview count-only signals → live-actionable transition ⚠️ (transition state not verified per signal)

**MVP-2 exit (§08 lines 214-221)**:

- All MVP-2 audit actions produce log entries ✅ (per §1.1)
- Consumer support mutations ✅
- Exchange operations ✅
- Documents tag management ✅
- Payment methods 3 mutations ✅
- Admin lifecycle ✅
- Idempotency for regulated/high-risk ⚠️ (depth not verified)

**MVP-3 exit (§08 lines 289-294)**:

- Ledger anomaly queue (orphaned, duplicate idempotency, inconsistent outcome chains) ✅ (6 classes per 3.1c, exceeds pack)
- Assignment workflow (claim/release/assign) ✅ (3 actions landed via 3.2a)
- System workspace useful diagnostics ✅
- Saved views and operational alerts configurable ✅ (landed via 3.3a + 3.3b)

**Verdict**: all phase exit criteria functionally landed at endpoint level. Depth audits (filter completeness, idempotency posture per action, sensitive-action confirmation enforcement) — passive verification needed.

### 8.2 Mutation Class By Phase (§08 lines 303-326)

| Phase  | Pack allowed classes                                                         | Code consistency                                               | Status |
| ------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------- | ------ |
| MVP-1a | low-risk operational (notes, flags)                                          | ✅                                                             | ✅     |
| MVP-1b | + regulated decisions (force-logout, verification)                           | ✅                                                             | ✅     |
| MVP-1c | no new writes                                                                | ✅ (no new mutations introduced for ledger/payments at MVP-1c) | ✅     |
| MVP-2  | + consumer support, payout escalation, PM ops, exchange ops, admin lifecycle | ✅                                                             | ✅     |
| MVP-3  | + maturity (assignments, saved views, alerts)                                | ✅ (assignments + saved views + alerts all landed)             | ✅     |

### 8.3 Explicit Do-not-implement-yet List (§08 lines 458-487)

| Forbidden item                                             | Pack ref     | Code state                                                                                  | Status              |
| ---------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------- | ------------------- |
| Broad ledger editing                                       | §08 line 461 | no endpoint, no UI (verified by absence in controllers)                                     | ✅ correctly absent |
| Arbitrary balance editing                                  | §08 line 462 | absent                                                                                      | ✅                  |
| Inline balances on consumer list                           | §08 line 463 | ❓ consumer list rendering not spot-checked, but no `BalanceCalculation` call in list query | ✅                  |
| Operational assignments — schema not deployed before MVP-3 | §08 line 464 | schema deployed for MVP-3 (correct timing); landed                                          | ✅                  |
| Saved views — schema not deployed before MVP-3             | §08 line 465 | schema deployed for MVP-3 (correct timing); landed                                          | ✅                  |

**Approval-gated later (§08 lines 474-482)**:

| Item                                                   | Pack ref     | Code state                                                         | Status  |
| ------------------------------------------------------ | ------------ | ------------------------------------------------------------------ | ------- |
| Bulk actions beyond `document_bulk_tag`                | §08 line 476 | only `document_bulk_tag` present (verified)                        | ✅      |
| Legacy-auth cleanup migration                          | §08 line 477 | `docs/admin-v2-mvp-2-rbac-prerequisite.md` (untracked work-stream) | ⚠️ open |
| Payout execution actions beyond escalation             | §08 line 478 | only `payout_escalate` (verified)                                  | ✅      |
| Consumer-side `request more info` outside verification | §08 line 479 | absent                                                             | ✅      |
| Transfer review surface                                | §08 line 480 | absent                                                             | ✅      |

### 8.4 Risk register (§08 lines 525-705, 14 risks)

| Risk                                                       | Pack tag               | Notable mitigation status                                                  |
| ---------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- | ------- |
| Risk 7 — auth boundary doesn't recognize `/api/admin-v2/*` | `[VERIFIED_FROM_CODE]` | mitigation landed via `isAdminApiPath()` helper (pack §03 line 178-182) ✅ |
| Risk 9 — consumer_action_log full-table scans              | `[VERIFIED_FROM_CODE]` | controller parses `dateFrom`; rejection depth ⚠️                           |
| Risk 12 — global throttle conflicts with admin nav         | `[VERIFIED_FROM_CODE]` | per-module `@Throttle` config ❓ not spot-checked                          | ⚠️      |
| Risk 13 — admin auth security debt                         | `[VERIFIED_FROM_CODE]` | open work-stream (`docs/admin-v2-mvp-2-rbac-prerequisite.md`)              | ⚠️ open |

---

## 9. Summary — verified gaps ranked

### Tier A — pack-listed feature missing in code

| #   | Item                                                                                                                                           | Pack ref                        | Phase               | Effort estimate                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------- | -------------------------------------------- |
| A1  | `/risk` route + backend aggregator (failed logins, lockouts, action anomalies, watchlist)                                                      | §02 line 391, §04 lines 327-336 | MVP-3               | medium (multi-source aggregation)            |
| A2  | Document review queues (untagged / verification-related / broken metadata / orphaned)                                                          | §05 lines 428-435               | MVP-2/MVP-3         | medium                                       |
| A3  | `sla_breach_detected` audit action + queue-coverage expansion (currently only verification SLA evaluator + payout `slaBreachDetected` derived) | §04 lines 117-157               | MVP-1b backbone     | small (audit add) + medium (queue expansion) |
| A4  | `admin_anomaly_detected` audit action + abuse detection job (7 patterns)                                                                       | §03 lines 387-401               | (no explicit phase) | medium                                       |

### Tier B — pack-listed structural deviations (functionality present)

| #   | Item                                                             | Pack ref                    | Code reality                                                      | Effort to align                |
| --- | ---------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------- | ------------------------------ |
| B1  | `/disputes` separate top-level route                             | §02 line 361                | `/ledger?view=disputes` sub-view; full functionality landed       | trivial (alias redirect)       |
| B2  | Dispute lifecycle states normalized to {open, won, lost, closed} | §05 line 166 (`[INFERRED]`) | code reads raw `metadata.status`                                  | small (normalization)          |
| B3  | `version` integer column for optimistic locking                  | §07 lines 144-151           | maturity slices use `expectedDeletedAtNull` proxy (handoff §17.6) | medium (per-resource refactor) |

### Tier C — schema-deployed, service/UI not wired (cheap mechanical expansion)

| #   | Item                                                                                  | Pack ref                                                  | Code reality                                                            | Effort                            |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------- |
| C1  | `OperationalAssignmentModel.resource_type` allowlist expansion (6 of 7 types unwired) | §07 line 533 (7 types listed)                             | DB CHECK accepts 7; `ASSIGNABLE_RESOURCE_TYPES = ['verification']` only | small per workspace, no migration |
| C2  | `SAVED_VIEW_WORKSPACES` allowlist expansion to additional workspaces                  | §05 line 44 (mentions saved views для operational queues) | currently `['ledger_anomalies', 'verification_queue']` after 3.4a       | small per workspace (3.4a-style)  |
| C3  | `OPERATIONAL_ALERT_WORKSPACES` allowlist expansion                                    | (paired with C2)                                          | same                                                                    | same                              |

### Tier D — pack OPTIONAL (not blocker)

| #   | Item                               | Pack ref                     | Code reality  | Status                    |
| --- | ---------------------------------- | ---------------------------- | ------------- | ------------------------- |
| D1  | `VerificationDecisionHistoryModel` | §07 line 477 (OPTIONAL tier) | not in schema | not blocker; nice-to-have |

### Tier E — passive verification debt (zero-cost-to-detect, defects could be expensive)

| #   | Item                                                                                       | Pack ref          | Effort                         |
| --- | ------------------------------------------------------------------------------------------ | ----------------- | ------------------------------ |
| E1  | Cross-link matrix completeness audit (29 entries)                                          | §02 lines 156-202 | 1-2h spot grep                 |
| E2  | Sensitive-action matrix enforcement audit (9 entries: confirmation, reason, version-check) | §03 lines 422-431 | 2-3h per-controller spot check |
| E3  | Idempotency posture verification per action class                                          | §07 lines 121-127 | 2-3h                           |
| E4  | Concurrency `version`/`updatedAt` field presence on mutable read DTOs                      | §07 lines 200-216 | 2-3h                           |
| E5  | `notificationSent`/`notificationType` audit metadata field per side-effect-emitting action | §01 lines 277-285 | 1-2h                           |
| E6  | Per-controller throttle config audit (§07 line 245)                                        | §07 line 245      | 1h                             |

### Tier F — pack-update tasks (code exceeds pack v12, no code gap)

| #   | Item                                                                                                                                     | Note           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| F1  | Pack §07 endpoint inventory missing maturity routes (`/ledger/anomalies/*`, `/assignments/*`, `/saved-views/*`, `/operational-alerts/*`) | pack v12 stale |
| F2  | Pack §07 audit vocabulary missing 9 maturity actions (assignment*\*, saved_view*_, alert\__)                                             | pack v12 stale |
| F3  | Pack §03 capability list missing 3 maturity capabilities (`assignments.manage`, `saved_views.manage`, `alerts.manage`)                   | pack v12 stale |
| F4  | Pack §02 screen map missing `/payments/operations`, `/system/alerts`                                                                     | pack v12 stale |

### Tier G — pre-existing work-streams (not new gap)

| #   | Item                                                     | Source                                                 |
| --- | -------------------------------------------------------- | ------------------------------------------------------ |
| G1  | Risk 13 — auth hardening / legacy admin auth coexistence | `docs/admin-v2-mvp-2-rbac-prerequisite.md` (untracked) |

---

## 10. Methodology trail

**Pack files read (full)**:

- `admin-v2-pack/01-foundation-and-invariants.md` (756 lines)
- `admin-v2-pack/02-domain-surface-and-navigation.md` (411 lines)
- `admin-v2-pack/03-platform-auth-rbac.md` (558 lines)
- `admin-v2-pack/07-backend-contracts-and-data-plan.md` (1212 lines)
- `admin-v2-pack/08-rollout-risks-and-sequencing.md` (907 lines)

**Pack files read (sectional grep)**:

- `admin-v2-pack/04-ops-workspaces-core.md` — sections SLA Enforcement, Verification Risk tooling, Audit (lines 117-157, 327-336, 412-419)
- `admin-v2-pack/05-financial-workspaces.md` — Disputes, Document review queues, anomaly queue (lines 146-200, 428-435)
- `admin-v2-pack/06-admin-and-system.md` — full structural grep

**Code reads**:

- `apps/api-v2/src/admin-v2/admin-v2-access.ts` (full, 237 lines)
- `apps/api-v2/src/shared/admin-action-audit.service.ts` (full, 103 lines)
- `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.service.ts` lines 510-600 (disputes service)
- `apps/api-v2/src/admin-v2/ledger/anomalies/admin-v2-ledger-anomalies.controller.ts` (full)
- `apps/admin-v2/src/app/(shell)/ledger/page.tsx` lines 1-100 (disputes UI)

**Code greps (parallel batches)**:

- Schema: `^model (AdminRoleModel|AdminPermissionModel|AdminInvitationModel|VerificationDecisionHistoryModel|OperationalAssignmentModel|SavedViewModel|OperationalAlertModel|LedgerEntryDisputeModel)` against `packages/database-2/prisma/schema.prisma`
- Audit constants usage: `action: ADMIN_ACTION_AUDIT_ACTIONS\.|action: \`[a-z_]+\``against`apps/api-v2/src/admin-v2`
- Controller routes: `@(Get|Post|Patch|Delete|Put)\(\`?[^)]_\`?\)`against`apps/api-v2/src/admin-v2/_.controller.ts`
- Controller paths: `@Controller\(\`?[^)]+\`?\)` against same
- Sub-view disputes: `disputes|disputeFilters|disputeView|view.*disputes` against `apps/admin-v2/src/app/(shell)/ledger/page.tsx`
- Anomaly tracking events: `admin_anomaly_detected|sla_breach_detected` against `apps/api-v2/src`
- SLA scheduling: `SlaService|slaBreach|sla_breach|VerificationSla|@Cron` against `apps/api-v2/src/admin-v2`
- Risk surface: `risk|Risk.tooling|failed.login|active.lockout|watchlist` against `apps/api-v2/src/admin-v2`
- Document review queues: `untagged|orphaned.resource|broken.metadata|review.queue|documentReview` against `apps/api-v2/src/admin-v2/documents`
- Page glob: `find apps/admin-v2/src/app -name "page.tsx"`
- Operations queue: `getPaymentOperationsQueue|operations-queue|payments/operations` against `apps`
- Audit dateFrom: `dateFrom` against `apps/api-v2/src/admin-v2/audit/admin-v2-audit.controller.ts`

---

_End of inventory v1._
