# Remoola PostgreSQL Database Design Rules (Fintech Edition) — v2

Based on: **Habr — 25 Iron Rules of PostgreSQL Database Design** (adapted + hardened for Remoola fintech workflows).  
Last updated: **2026-02-25**.

> **Default rule:** follow these unless an exception is explicitly justified in the PR description
> (what you gain, what you risk, how you mitigate).

---

## I. Schema Foundation

### 1. Always Use Surrogate Primary Keys
**Criticality: maximum**

Natural keys (email, tax ID, username) can change. Use UUID for primary keys — they never change and work well in distributed systems. Prefer UUID v7 (time-sortable) when available.

```sql
-- ✅ Correct
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ❌ Incorrect
CREATE TABLE users (
  email TEXT PRIMARY KEY
);
```

> **Fintech note:** surrogate PK does not replace business uniqueness — keep UNIQUE constraints on business identifiers.

### 2. Every *Mutable Business* Table MUST Have created_at and updated_at
**Criticality: maximum**

Without timestamps you cannot debug incidents, build audit trails, or run incremental ETL. Use `TIMESTAMPTZ`, not `TIMESTAMP`.

✅ Default for business tables:

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

✅ Common exceptions (allowed): **static/lookup tables** (currencies, ISO codes) when justified.

### 3. Use TIMESTAMPTZ, Not TIMESTAMP
**Criticality: high**

`TIMESTAMP` silently discards timezone information. `TIMESTAMPTZ` stores everything in UTC.

```sql
-- ✅ Correct
event_time TIMESTAMPTZ NOT NULL

-- ❌ Incorrect
event_time TIMESTAMP
```

### 4. Use TEXT Instead of VARCHAR(n) (Unless Semantically Fixed-Length)
**Criticality: normal**

In PostgreSQL, `TEXT` and `VARCHAR` have identical performance. `VARCHAR(n)` only adds a CHECK constraint you'll need to migrate when requirements change.

✅ Default: use `TEXT` + explicit `CHECK` constraints.

```sql
-- ✅ Correct
name TEXT NOT NULL,
CONSTRAINT chk_name_len CHECK(length(name) <= 255)

-- ❌ Incorrect
name VARCHAR(255)
```

✅ Allowed exceptions (fixed-length semantics):
- `currency_code` (3)
- `country_code` (2)
- hashes / fixed tokens

### 5. Use UUID for IDs, Prefer UUID v7
**Criticality: maximum**

Use UUID for all primary keys. Avoid INT/BIGINT/SERIAL for IDs — UUIDs are globally unique and avoid coordination. Prefer UUID v7 (time-sortable, index-friendly) over UUID v4.

```sql
-- ✅ Correct (safe default)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- With PostgreSQL 18+ (UUID v7, time-sortable):
id UUID PRIMARY KEY DEFAULT uuidv7()

-- ❌ Incorrect
id SERIAL PRIMARY KEY
id BIGSERIAL PRIMARY KEY
```

> **Performance escape hatch (rare):** for *extremely hot write* tables, `BIGINT` internal PK + `UUID` public id can be justified, but only with evidence and clear exposure rules.

---

## II. Relationships and Foreign Keys

### 6. ALWAYS Define Explicit Foreign Keys
**Criticality: maximum**

Without FKs, orphaned rows will silently accumulate.

```sql
-- ✅ Correct
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE

-- ❌ Incorrect
user_id UUID  -- no REFERENCES constraint
```

### 7. Choose ON DELETE Consciously
**Criticality: maximum**

- `RESTRICT` (default) — blocks deletion
- `CASCADE` — automatically deletes child rows
- `SET NULL` — keeps the row, nulls the reference

```sql
-- Dependent data: CASCADE
REFERENCES orders(id) ON DELETE CASCADE

-- Optional reference: SET NULL
REFERENCES users(id) ON DELETE SET NULL

-- Critical data: RESTRICT
REFERENCES accounts(id)
```

> **Fintech rule:** never cascade-delete **ledger / payment history / audit** data.

### 8. Use Junction Tables for M:N
**Criticality: maximum**

Never use arrays or comma-separated strings for many-to-many relationships.

```sql
-- ✅ Correct
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- ❌ Incorrect
role_ids INTEGER[]
roles TEXT  -- 'admin,editor'
```

### 9. Index Every FK Column
**Criticality: high**

PostgreSQL does NOT create indexes automatically for FKs.

```sql
-- ✅ Correct
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### 10. Prefer Soft Delete for *User-Facing* Business Entities (Not for Ledgers/Audit)
**Criticality: high**

Soft delete is useful for user-facing data (users, contacts, documents) but **dangerous** when applied blindly.

✅ For user-facing entities:

```sql
deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX idx_users_active ON users(email)
WHERE deleted_at IS NULL;
```

❌ For ledgers/audit/payment history:
- do **not** soft delete
- treat as immutable append-only history (see Rule 28)

---

## III. Normalization and Data Integrity

### 11. Normalize to 3NF Minimum, Denormalize Consciously
**Criticality: maximum**

Document why you denormalized (what query it accelerates, what consistency risk it adds).

### 12. Use NOT NULL by Default, NULL Only Intentionally
**Criticality: maximum**

`NULL` introduces three-valued logic. Each nullable column forces `COALESCE` everywhere.

```sql
-- ✅ Correct
status TEXT NOT NULL DEFAULT 'pending',
deleted_at TIMESTAMPTZ  -- NULL intentionally
```

### 13. Use CHECK Constraints for Validation
**Criticality: high**

Database constraints are the last line of defense and always run.

```sql
-- ✅ Correct
CONSTRAINT chk_price_positive CHECK (price > 0),
CONSTRAINT chk_status_valid CHECK (status IN ('active','inactive','suspended'))
```

### 14. Use NUMERIC for Money, Never FLOAT/DOUBLE (Or Store Cents as BIGINT)
**Criticality: maximum**

`NUMERIC(precision, scale)` gives exact decimal math. Or store cents as `BIGINT` for throughput.

```sql
-- ✅ Correct
price NUMERIC(12,2) NOT NULL,
balance NUMERIC(15,2) NOT NULL
-- or: price_cents BIGINT NOT NULL
```

### 15. Use ENUM Cautiously — Prefer CHECK or Lookup Tables
**Criticality: normal**

PostgreSQL ENUMs are harder to evolve. CHECK constraints or lookup tables are more flexible.

```sql
-- ✅ Correct: CHECK
status TEXT NOT NULL CHECK(status IN ('draft','published'))
```

---

## IV. Indexing and Performance

### 16. Create Indexes for Every *Proven* WHERE, JOIN, and ORDER BY Pattern
**Criticality: maximum**

Indexes are not free (write overhead + storage). The rule is: **index the patterns you actually use** (based on EXPLAIN and workload).

```sql
-- ✅ Correct
CREATE INDEX idx_orders_user_status
ON orders(user_id, status) WHERE deleted_at IS NULL;
```

### 17. Use Partial Indexes
**Criticality: high**

Index only the rows you need.

```sql
-- ✅ Correct
CREATE INDEX idx_orders_pending
ON orders(created_at) WHERE status = 'pending';
```

### 18. Use EXPLAIN ANALYZE Before Deploying Queries
**Criticality: high**

`Seq Scan` on a large table = investigate indexing or query rewrite.

### 19. Use Connection Pooling (PgBouncer)
**Criticality: maximum**

Each PostgreSQL connection is expensive. PgBouncer multiplexes connections.

```
App → PgBouncer (port 6432) → PostgreSQL
pool_mode = transaction
default_pool_size = 20
```

---

## V. Migrations and Operations

### 20. Never Change Columns in Production Without a Migration Plan
**Criticality: maximum**

Strategy: add new column → backfill → switch reads → remove old.

For **standardizing column names** (e.g. camelCase → snake_case): use a migration with `RENAME COLUMN` only — no data loss. Deploy order:
1) run migration
2) deploy app with updated Prisma `@map` + raw SQL
3) keep a short maintenance window so old app is not running against renamed columns

```sql
-- ✅ Correct (additive, zero-downtime)
ALTER TABLE users ADD COLUMN name_new TEXT;

-- ✅ Correct (standardization only: rename to snake_case, no data loss)
ALTER TABLE ledger_entry RENAME COLUMN "currencyCode" TO "currency_code";
```

### 21. Use UUID v7 When Available
**Criticality: high**

UUID v7 is time-sortable and index-friendlier than random UUID v4.

### 22. Always Use Transactions for Multi-Step Operations
**Criticality: maximum**

```sql
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = '...';
  UPDATE accounts SET balance = balance + 100 WHERE id = '...';
COMMIT;
```

### 23. Partition Large Tables When Growth Impacts Vacuum/Latency (Often 10M–100M+)
**Criticality: high**

Partition by time (RANGE) or tenant (LIST/HASH) when table size harms performance/ops.

```sql
CREATE TABLE events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL,
  payload JSONB
) PARTITION BY RANGE (created_at);
```

### 24. Store JSON in JSONB, Not JSON or TEXT
**Criticality: normal**

`JSONB` supports indexes (GIN) and containment operators (`@>`, `?`).

```sql
metadata JSONB NOT NULL DEFAULT '{}';
CREATE INDEX idx_meta_gin ON products USING GIN(metadata);
```

### 25. Use Row-Level Security (RLS) for Multi-Tenant Apps (Benchmark Carefully)
**Criticality: normal**

RLS can be great for tenant isolation but can also impact performance if misconfigured.

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON documents
USING (tenant_id = current_setting('app.tenant_id'));
```

### 26. Column Names MUST Be snake_case — Any camelCase Field MUST Use @map(snake_case)
**Criticality: maximum (Remoola / Prisma)**

All database column names must be snake_case.

- **Any camelCase Prisma field** that maps to a DB column MUST have `@map("snake_case")`.
- Raw SQL must reference the real column names (snake_case).
- To unify existing camelCase columns: migration with `RENAME COLUMN` only + coordinated deploy.

---

## VI. Fintech-Grade Additions (Remoola-Required)

### 27. Idempotency MUST Be Enforced at the Database Level
**Criticality: maximum**

Any operation that can charge, transfer, create ledger entries, or handle webhooks must have an idempotency key and a UNIQUE constraint to prevent double-processing.

Examples:
- `UNIQUE(consumer_id, idempotency_key)`
- `UNIQUE(payment_request_id, idempotency_key)`
- `UNIQUE(provider, provider_event_id)` for webhooks

### 28. Ledger / Payment History Tables Are Append-Only
**Criticality: maximum**

- **No UPDATE** to money history.
- **No DELETE** (hard or soft) of ledger/payment history.
- Corrections must be done via **reversals / compensating rows**.

### 29. Every Money-Impacting Row Must Be Traceable
**Criticality: maximum**

Store enough metadata to reconstruct causality and reconcile:
- `correlation_id`
- `idempotency_key`
- `source` (module/job/webhook)
- external provider ids (e.g., Stripe event/payment intent ids)

### 30. Money Moves Must Be Atomic
**Criticality: maximum**

All multi-step financial state transitions must be wrapped in a single transaction:
- create/confirm payment intent
- insert ledger entries
- update balances (if you store them)
- record audit/event rows

---

## Naming Cheat Sheet

| Element        | Convention |
|----------------|------------|
| Tables         | Plural, `snake_case`: `users`, `order_items` |
| Columns        | Always `snake_case` in DB; Prisma camelCase columns must use `@map("snake_case")` |
| Primary keys   | Always `id` with type `UUID` |
| Foreign keys   | `{singular_table}_id`: `user_id`, `order_id` |
| Indexes        | `idx_{table}_{columns}`: `idx_users_email` |
| Constraints    | `chk_{table}_{desc}`, `uq_{table}_{cols}` |
| Timestamps     | `created_at` + `updated_at`, `TIMESTAMPTZ` |

---

## PR Gate Checklist (Schema / Money Path)

1) Idempotency constraint exists for any re-tryable money workflow (Rule 27)  
2) Ledger/history immutability respected (Rule 28)  
3) Transaction wraps all multi-step money operations (Rule 30)  
4) FKs exist + FK indexes exist (Rules 6, 9)  
5) NOT NULL + CHECK/UNIQUE enforce invariants (Rules 12–15)  
6) Migration is additive + deploy-safe (Rule 20)  
7) Column naming + Prisma `@map` compliance (Rule 26)  