# Migration Safety Audit — Prisma schema & migrations

**Scope:** `packages/database-2/prisma/` (schema + all migrations)  
**Rules:** additive-first, no DROP on hot paths, backfill/lock/down strategy (governance §2.1 B3, migration READMEs)  
**Date:** 2026-03-04  
**Model tier:** CRITICAL (full re-audit)

---

## 1. Executive summary

| Result | Count |
|--------|--------|
| **BLOCKERS** | 0 |
| **WARN** | 5 |
| **NOTE** | 7 |

Critical tables **ledger_entry**, **ledger_entry_outcome**, **ledger_entry_dispute**, **stripe_webhook_event**, and auth tables (**access_refresh_token**, **auth_audit_log**, **oauth_state**) are not subject to any DROP TABLE or DROP COLUMN in migrations. One DROP COLUMN exists on **payment_request** (expectation_date) with prior archive + conditional drop. Index/constraint changes on ledger and webhook tables are additive or index-swaps with rollback paths. No backfill is required for future NOT NULL on critical tables in current migrations; historical NOT NULL additions are documented in READMEs.

---

## 2. BLOCKERS

**None.**

- No migration performs DROP TABLE or DROP COLUMN on `ledger_entry`, `ledger_entry_outcome`, `ledger_entry_dispute`, `stripe_webhook_event`, or critical auth tables.
- `20260304120000_ledger_entry_outcome_dispute_cascade` only DROP/ADDs FK constraints (RESTRICT→CASCADE), not tables or columns.

---

## 3. WARN

### WARN 1 — `20260112124512_standardize_schema`: ALTER on ledger_entry and auth table

- **File:** `migrations/20260112124512_standardize_schema/migration.sql`
- **What:**  
  - `ledger_entry`: type changes `Text` → `VARCHAR(255)` for `stripe_id`, `created_by`, `updated_by`, `deleted_by`; ADD COLUMN `idempotency_key`; DROP INDEX then CREATE UNIQUE on `idempotency_key`.  
  - `access_refresh_token`: `created_at` / `updated_at` SET NOT NULL (no in-migration backfill).
- **Risks:**  
  - Truncation if any value length > 255.  
  - Migration fails if any NULL in `access_refresh_token.created_at`/`updated_at` (README requires backfill before deploy).
- **Mitigation:** README documents “Backfill created_at/updated_at … where required” and deploy order. For future similar migrations, add an explicit backfill step in SQL or a pre-migration check.

---

### WARN 2 — `20260218130000_remove_expectation_date_with_archive`: DROP COLUMN on business table

- **File:** `migrations/20260218130000_remove_expectation_date_with_archive/migration.sql`
- **What:** DROP COLUMN `expectation_date` on `payment_request` after archiving into `payment_request_expectation_date_archive` (conditional in DO block).
- **Risk:** DROP COLUMN takes an ACCESS EXCLUSIVE lock briefly; `payment_request` is on the payment path (not in the “fintech hot path” list for B3).
- **Mitigation:** Additive-first satisfied (archive table + copy then drop). README documents rollback (re-add column, backfill from archive). Acceptable with deploy during low traffic or maintenance window.

---

### WARN 3 — `20260304120000_ledger_entry_outcome_dispute_cascade`: FK RESTRICT → CASCADE

- **File:** `migrations/20260304120000_ledger_entry_outcome_dispute_cascade/migration.sql`
- **What:** `ledger_entry_outcome` and `ledger_entry_dispute` FKs to `ledger_entry` changed from ON DELETE RESTRICT to ON DELETE CASCADE.
- **Risk:** Deleting a `ledger_entry` (or a consumer, which cascades to ledger_entry) now deletes outcome/dispute rows. Accidental hard-delete of consumer removes financial audit trail.
- **Mitigation:** README states production should use soft-delete only (`consumer.deleted_at`) and restrict DB/Studio access. Rollback SQL is documented. Migration-safety compliant; operational/runbook concern.

---

### WARN 4 — `20260120152444_uniques`: DROP INDEX on multiple tables + ALTER auth

- **File:** `migrations/20260120152444_uniques/migration.sql`
- **What:** Multiple DROP INDEX (replaced by new unique indexes) on address_details, admin, consumer, consumer_resource, contact, exchange_rate, google_profile_details, organization_details, payment_method, payment_request_attachment, personal_details. ALTER on `access_refresh_token` (access_token/refresh_token SET DATA TYPE TEXT) and `payment_method` (billing_details_id DROP NOT NULL).
- **Risk:** Brief table locks during DROP/CREATE INDEX; auth table column type change. No DROP on ledger_entry / stripe_webhook_event.
- **Mitigation:** Indexes are replaced in same migration; ALTER is type-widening (TEXT). For future batches, consider CONCURRENTLY for index builds if tables are large.

---

### WARN 5 — `20260219140433_get_rid_unused`: README vs migration.sql mismatch; archive rollback

- **File:** `migrations/20260219140433_get_rid_unused/migration.sql`, `README.md`
- **What:** README states the migration "Drops table payment_request_expectation_date_archive (if it exists)". The migration file contains **no executable SQL** (only Prisma warning comment). So the archive table is **not** dropped when the migration runs; rollback path from `20260218130000_remove_expectation_date_with_archive` remains available.
- **Risk:** If DROP TABLE is added to the migration later, rollback (re-add column + backfill from archive) is no longer possible; audit data lost. Doc/code drift: README says "drops" but migration is a no-op.
- **Mitigation:** Either (1) leave migration as no-op and update README to "Intentionally no-op; archive retained for audit/rollback", or (2) if dropping the archive is required, document as irreversible and export data before deploy. Do not add DROP TABLE without governance approval.

---

## 4. NOTE

### NOTE 1 — Additive-first compliance (B3)

- **20260225045952_stripe_webhook_event_dedup:** CREATE TABLE only; additive.  
- **20260225120000_standardize_columns_snake_case:** RENAME COLUMN only on ledger_entry and others; no DROP. Deploy order (migrate then deploy app) in README.  
- **20260225140000_ledger_entry_outcome_append_only:** New tables + FKs; no change to ledger_entry columns. README describes rollback (drop tables only if app no longer uses them).

---

### NOTE 2 — Backfill strategy

- **20260112124512_standardize_schema:** README requires backfilling `created_at`/`updated_at` and ensuring no duplicate `idempotency_key` before running. No in-migration backfill.  
- **20260126121500_verification_status:** New NOT NULL column with DEFAULT; no backfill needed.  
- **20260218130000_remove_expectation_date_with_archive:** Archive populated in same migration before DROP COLUMN; no separate backfill run required.

---

### NOTE 3 — Lock / down strategy

- No long-running data backfills in a single transaction in the reviewed migrations.  
- **20260303120000_ledger_entry_outcome_unique_external:** README includes preflight (duplicate check) and rollback (DROP INDEX). Partial unique index `WHERE external_id IS NOT NULL` avoids backfill.  
- **20260303140000_exchange_rate_status_enum_snake_case:** ALTER TYPE RENAME; brief ACCESS EXCLUSIVE on type. README documents rollback. Consider running during low FX load.

---

### NOTE 4 — Index and constraint safety

- **ledger_entry:**  
  - `20251217101337`: CREATE UNIQUE (payment_request_id, ledger_id, type).  
  - `20251217124641`: DROP that index; CREATE UNIQUE (payment_request_id, ledger_id, consumer_id, type) + payment_request_id index.  
  - `20260112124512`: DROP that unique; ADD idempotency_key; CREATE UNIQUE on idempotency_key.  
  All are index/constraint changes; no column drop. Duplicate data would cause migration failure (documented in READMEs).  
- **ledger_entry_outcome:**  
  - `20260303120000`: Partial unique index (ledger_entry_id, external_id) WHERE external_id IS NOT NULL; README preflight for duplicates.  
- **stripe_webhook_event:** Unique on event_id in create migration only; no later DROP.

---

### NOTE 5 — Timestamps and types

- Schema uses `@db.Timestamptz(6)` for timestamp fields; critical models have `created_at`/`updated_at` where expected.  
- **20260218113000_align_uuid_defaults_and_text_types:** Aligns PK defaults and TEXT types; includes ledger_entry and access_refresh_token. Type changes are to TEXT (no narrowing).

---

### NOTE 6 — Trigger not in migrations (documentation vs implementation)

- Governance (`docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md`) and schema comment state that a DB trigger syncs `ledger_entry.status` from `ledger_entry_outcome`.
- No migration in `packages/database-2/prisma/migrations` contains `CREATE TRIGGER` or `CREATE FUNCTION`.
- Balance logic may rely on application/raw SQL (e.g. COALESCE(latest outcome, ledger_entry.status)) rather than a trigger.
- **Action:** Align docs with implementation (either add trigger in a migration or update governance/schema comment to describe the actual read path).

---

### NOTE 7 — Hot-path verification (B3)

- **ledger_entry:** No DROP TABLE/COLUMN in any migration. `20260112124512`: DROP INDEX + ADD idempotency_key + CREATE UNIQUE; `20251217124641`: DROP INDEX only; `20260225120000`: RENAME COLUMN only.
- **ledger_entry_outcome / ledger_entry_dispute:** Only `20260304120000`: DROP CONSTRAINT then ADD CONSTRAINT (RESTRICT→CASCADE). No DROP TABLE/COLUMN.
- **stripe_webhook_event:** Only `20260225045952`: CREATE TABLE + UNIQUE; no later DROP.
- **access_refresh_token / auth_audit_log / oauth_state:** No DROP TABLE/COLUMN; only ALTER (SET NOT NULL, SET DATA TYPE TEXT).

---

## 5. Minimal diff suggestions (optional)

1. **20260112124512:** In README, add a one-line “Pre-migration check” example for duplicate `idempotency_key`:  
   `SELECT idempotency_key, COUNT(*) FROM ledger_entry WHERE idempotency_key IS NOT NULL GROUP BY idempotency_key HAVING COUNT(*) > 1;`  
   and for NULL `created_at`/`updated_at` on `access_refresh_token` if backfill is not scripted.

2. **20260303140000:** In README, add “Lock: brief ACCESS EXCLUSIVE on type; schedule during low exchange_rate write load if needed.”

3. **Governance / schema:** Either add a migration that creates `sync_ledger_entry_status_from_outcome` (and document in README), or change governance and schema comment to “Balance queries use COALESCE(latest outcome.status, ledger_entry.status) in application/raw SQL” (no trigger).

4. **Follow-up status:** No new Prisma schema or migration files were changed in this audit follow-up; migration risk posture and WARN items above remain the current baseline.

---

## 6. Quick reference: BLOCKERS / WARN / NOTE (migration refs)

| Level    | Id   | Migration / file |
|----------|------|-------------------|
| BLOCKER  | —    | None. |
| WARN     | 1    | `20260112124512_standardize_schema/migration.sql` — ledger_entry type/unique; access_refresh_token SET NOT NULL. |
| WARN     | 2    | `20260218130000_remove_expectation_date_with_archive/migration.sql` — DROP COLUMN payment_request.expectation_date (after archive). |
| WARN     | 3    | `20260304120000_ledger_entry_outcome_dispute_cascade/migration.sql` — FK RESTRICT→CASCADE (consumer delete cascades). |
| WARN     | 4    | `20260120152444_uniques/migration.sql` — DROP INDEX (multiple tables); ALTER access_refresh_token. |
| WARN     | 5    | `20260219140433_get_rid_unused/` — README says drop archive; migration.sql has no SQL (no-op). |
| NOTE     | 1    | Additive-first (B3): 20260225045952, 20260225120000, 20260225140000. |
| NOTE     | 2    | Backfill: 20260112124512 (README); 20260126121500 (DEFAULT); 20260218130000 (in-migration archive). |
| NOTE     | 3    | Lock/down: 20260303120000 (preflight + rollback README); 20260303140000 (ALTER TYPE lock). |
| NOTE     | 4    | Index/constraint safety on ledger_entry, ledger_entry_outcome, stripe_webhook_event. |
| NOTE     | 5    | Timestamps: schema Timestamptz(6); 20260218113000 type alignment. |
| NOTE     | 6    | Trigger: no CREATE TRIGGER in migrations; align governance/schema with app read path. |
| NOTE     | 7    | Hot-path verification (B3): no DROP on ledger_entry, ledger_entry_outcome, stripe_webhook_event, auth. |

---

## 7. References

- **Governance:** `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md` §2.1 (B3), §8 (migrations table).  
- **Migration READMEs:** `packages/database-2/prisma/migrations/*/README.md` (standardize_schema, stripe_webhook_event_dedup, standardize_columns_snake_case, ledger_entry_outcome_append_only, ledger_entry_outcome_unique_external, ledger_entry_outcome_dispute_cascade, remove_expectation_date_with_archive, get_rid_unused, exchange_rate_status_enum_snake_case).  
- **Skill:** `.cursor/skills/migration-safety/SKILL.md`.
