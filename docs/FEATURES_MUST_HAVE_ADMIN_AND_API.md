# Features That Must Be Implemented for apps/admin + apps/api (Fintech-Grade)

**Scope:** `apps/admin`, `apps/api` (admin module)  
**Sources:** `packages/database-2/prisma/schema.prisma`, current project state, `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md`  
**Last updated:** 2026-03-04

---

## 1. Purpose

This document lists **must-have** features for the admin application and the admin API to be **fintech-safe** and aligned with the Prisma schema and governance rules. It is intended for planning and orchestration (e.g. `/orchestrate`); items marked as **Gap** require implementation; items marked as **Required** are compliance invariants that must remain in place.

---

## 2. Schema Reference (Relevant Models)

| Model | Purpose (fintech note) |
|-------|------------------------|
| `AdminModel` | Admin identity; SUPER vs ADMIN; soft-delete |
| `AdminActionAuditLogModel` | Append-only audit of sensitive admin actions |
| `AuthAuditLogModel` | Login/logout and per-email lockout audit |
| `AuthLoginLockoutModel` | Per-email lockout after N failed attempts |
| `StripeWebhookEventModel` | At-most-once webhook processing by `event_id` |
| `ConsumerModel` | Consumer identity, verification, KYC-related fields |
| `LedgerEntryModel` | Signed amounts; idempotency; no app-level UPDATE/DELETE |
| `LedgerEntryOutcomeModel` | Append-only status transitions (trigger syncs to `ledger_entry.status`) |
| `LedgerEntryDisputeModel` | Append-only dispute log per ledger entry |
| `PaymentRequestModel` | Payment requests; refund/chargeback via admin |
| `ExchangeRateModel` | FX rates; admin create/update/delete with audit |
| `WalletAutoConversionRuleModel` | Auto-conversion rules (admin list/update/run) |
| `ScheduledFxConversionModel` | Scheduled FX (admin list/cancel/execute) |
| `ResourceModel`, `ConsumerResourceModel`, `ResourceTagModel`, `DocumentTagModel` | Documents/resources (sidebar: "later: Resources") |

---

## 3. Must-Have Features (Fintech-Safe)

### 3.1 Already Implemented (Must Be Preserved)

- **Admin auth:** Login, refresh, logout, `/me`; cookie-based JWT; step-up for sensitive actions.
- **Admin CRUD (partial):** List, get-by-id, password change, delete/restore (SUPER only); step-up for password change and delete.
- **Admin action audit:** Append-only `admin_action_audit_log` for: payment_refund, payment_chargeback, admin_password_change, admin_delete, admin_restore, consumer_verification_update, exchange_rate_create/update/delete, exchange_rule_run, exchange_scheduled_cancel/execute.
- **Consumer management:** List, get-by-id, verification workflow (approve/reject/flag/more info) with audit.
- **Payment requests:** List, expectation-date archive, get-by-id, refund, chargeback (with step-up and idempotency).
- **Ledger:** Paginated list with search/filters (q, type, status, includeDeleted); bounded reads (pageSize cap).
- **Exchange:** Rates CRUD; rules list/update/run; scheduled list/cancel/execute; currencies list; all sensitive actions audited.
- **Dashboard:** Stats, payment-requests-by-status, recent payment requests, ledger anomalies, verification queue.
- **Audit (SUPER-only):** GET auth log, GET actions log (paginated, filters).
- **Financial safety:** Reversals under advisory lock; balance via `SELECT ... FOR UPDATE`; no UPDATE/DELETE on ledger; idempotency for reversals; Stripe webhook dedup by `event_id`.

### 3.2 Gaps — Must Be Implemented

#### API (apps/api)

| # | Feature | Rationale |
|---|--------|-----------|
| 1 | **POST `admin/admins` (create admin)** | Admin app already has "Create admin" UI (POST `/api/admins`). Backend has no `@Post()` for `admin/admins`; only GET list, GET :id, PATCH :id/password, PATCH :id. Create must be SUPER-only, and **must be audited** (add `admin_create` to `ADMIN_ACTION_AUDIT_ACTIONS` and record on create). |
| 2 | **GET `admin/ledger/:id` (single ledger entry)** | Ledger list exists; no single-entry detail. For audit and support, admin must be able to view one ledger entry **including** its `LedgerEntryOutcomeModel` history and `LedgerEntryDisputeModel` records (append-only trail). |
| 3 | **Admin create audit** | When POST admin/admins is implemented, record in `AdminActionAuditLogModel` with action e.g. `admin_create`, resource `admin`, resourceId = new admin id, plus IP/userAgent. |

#### Admin app (apps/admin)

| # | Feature | Rationale |
|---|--------|-----------|
| 4 | **Ledger entry detail page** | Once API has GET `admin/ledger/:id` (with outcomes + disputes), add a page (e.g. `/ledger/[id]`) to display one entry and its outcome/dispute trail. Link from ledger table (e.g. row click or "View" link). |
| 5 | **Resources (read-only) list** | Schema has `ResourceModel`, `ConsumerResourceModel`, `ResourceTagModel`, `DocumentTagModel`. Sidebar already notes "later: Resources". For compliance/support, admin should have a **read-only** list of resources (e.g. by consumer or global), with pagination and bounded query. |
| 6 | **Proxy for ledger by id** | If API adds GET `admin/ledger/:id`, admin app must add proxy route (e.g. `/api/ledger/[id]`) and use it on the ledger entry detail page. |

#### Optional but recommended (fintech-grade operations)

| # | Feature | Rationale |
|---|--------|-----------|
| 7 | **Auth lockout read (and optional unlock)** | `AuthLoginLockoutModel` supports per-email lockout. Admin (e.g. SUPER) may need to **view** lockout state and optionally **clear** lockout for support. API: GET (and optionally PATCH) for lockout by identityType+email or list; admin UI: small section under Audit or Settings. |
| 8 | **Stripe webhook events (read-only)** | `StripeWebhookEventModel` ensures at-most-once processing. For ops/debugging, a **read-only** list of processed `event_id`s (paginated) helps confirm delivery and debug duplicates. API: GET `admin/webhooks/events` (or similar); admin UI: optional "Webhook events" under Audit or a dedicated ops page. |

---

## 4. Compliance Checklist (Invariants)

These must hold for all current and new admin/API work:

- **Ledger:** No application-level UPDATE or DELETE on `ledger_entry`; status/dispute via append-only `ledger_entry_outcome` and `ledger_entry_dispute`; trigger syncs `ledger_entry.status`.
- **Idempotency:** Reversals (refund/chargeback) use idempotency keys; Stripe webhooks insert into `stripe_webhook_event` before processing; on duplicate, return 200 and do not reprocess.
- **Sensitive admin actions:** Every sensitive action (admin create/delete/restore, password change, verification update, refund, chargeback, exchange rate CRUD, rule run, scheduled cancel/execute) must be recorded in `admin_action_audit_log` with adminId, action, resource, resourceId, IP, userAgent.
- **Step-up:** Password change, admin delete, refund, and chargeback require step-up (re-enter password) before execution.
- **Bounded reads:** All list endpoints must use pagination with a capped pageSize (e.g. max 500); search/filter inputs (e.g. `q`) must be length-capped (e.g. 200 chars) to avoid abuse.
- **Soft-delete:** Admin list endpoints respect `deletedAt` unless `includeDeleted=true`; create admin must not allow re-use of same email for a non-deleted admin (schema: `@@unique([email, deletedAt])`).

---

## 5. API vs Admin Responsibility Summary

| Area | API (admin module) | Admin app |
|------|--------------------|-----------|
| Admin CRUD | Implement POST `admin/admins` + audit; keep GET/PATCH as today | Keep create form; ensure it calls new POST |
| Ledger | Add GET `admin/ledger/:id` with outcomes + disputes | Add `/ledger/[id]` page + proxy `/api/ledger/[id]` |
| Resources | (Optional) GET `admin/resources` paginated, read-only | (Optional) Resources nav + list page + proxy |
| Audit | Already: GET auth, GET actions | Already: Audit page with both tabs |
| Lockout / Webhooks | (Optional) GET lockout, GET webhook events | (Optional) UI for lockout and webhook events |

---

## 6. Migration and Idempotency Notes

- **No new migrations required** for the must-have items above: schema already has all needed tables and enums.
- **Admin create:** If implementing POST admin/admins, ensure unique constraint on `(email, deletedAt)` is respected (Prisma schema already has `@@unique([email, deletedAt])`).
- **Ledger detail:** Read-only; no new ledger writes. Include in response: `ledgerEntry` plus `outcomes` (order by createdAt desc) and `disputes`.

---

## 7. References

- `packages/database-2/prisma/schema.prisma` — full schema
- `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md` — invariants, critical surfaces, raw query rules
- `docs/FEATURES_CURRENT.md` — current implemented features
- `apps/api/src/shared/admin-action-audit.service.ts` — `ADMIN_ACTION_AUDIT_ACTIONS` and recording
