# Project Design Rules (Remoola)

> **Purpose:** Keep the repo predictable, maintainable, and fintech-safe.
> These rules apply to humans and AI agents. **When in doubt: choose safety + simplicity.**

---

## 1) Zero Dead Code Policy

Dead code is prohibited. Remove:

- unused files/modules/components
- unused services/providers
- unused DTOs/schemas/types
- abandoned feature flags

Audits:

```bash
npx knip
npx ts-prune
```

Rules:

- If code has no active consumer → delete it.
- Do not keep code “for future use” (Git is the archive).
- Prefer deletion over commenting-out.

---

## 2) Domain-Oriented Structure (Mandatory)

Folders must represent **business domains**, not technical junk drawers.

✅ Good:

```
payments/
ledger/
contacts/
auth/
calendar/
```

❌ Forbidden:

```
utils/
helpers/
common/
misc/
shared-temp/
```

Rule:

> Every folder must clearly answer: “Which business domain owns this?”

---

## 3) Monorepo Boundary Enforcement

Apps MUST NOT import from other apps.

Forbidden:

- `apps/consumer` → `apps/api`
- `apps/admin` → `apps/consumer` (and vice versa)

Allowed shared locations:

- `packages/api-types`
- `packages/database`
- `packages/ui`
- other explicit shared packages

Rules:

- Shared types/interfaces used in 2+ places belong in `packages/api-types`.
- Prefer package exports over file-path imports.

---

## 4) Dependency Hygiene

Dependencies must remain minimal and intentional.

Agents must:

- remove unused dependencies
- avoid duplicate overlapping libraries
- prevent devDependency-at-runtime leaks

Audits:

```bash
npx depcheck
yarn dedupe
```

Rules:

- Do not add libraries for trivial utilities.
- Prefer built-ins and existing repo utilities.

---

## 5) Naming Consistency

### Database naming

| Element | Rule |
|---|---|
| Tables | plural `snake_case` |
| Columns | `snake_case` |
| Primary key | `id` as `UUID` |
| Foreign keys | `{table}_id` |
| Index | `idx_{table}_{columns}` |
| Constraint | `chk_{table}_{desc}` / `uq_{table}_{cols}` |

### Code naming

Use explicit names and file suffixes:

- `payment-request.service.ts`
- `create-payment-request.dto.ts`

Forbidden:

- `helpers.ts`
- `manager.ts`
- vague `common.ts`

---

## 6) Migration Safety Rules (Critical)

Migrations are production infrastructure.

Agents MUST ensure:

- schema matches database reality
- no drift between Prisma and DB
- no destructive changes without explicit review
- each migration must have README.md (see samples in oldest migrations)

Verify:

```bash
prisma migrate status
```

Forbidden:

- editing applied migrations
- silent column/table drops
- data-loss migrations without plan

**Fintech rule:** ledger-related tables must never lose historical data.

---

## 7) Logging Discipline

`console.log` / `console.error` is forbidden in production code.

Use structured logging:

```ts
logger.error({
  correlationId,
  entityId,
  error,
})
```

Remove debug artifacts:

- `TODO temporary`
- debug flags / bypasses
- mock-only paths in prod code

Audits:

```bash
rg "console\.log|console\.error"
rg "TODO|FIXME"
```

---

## 8) Abstraction Control

Unnecessary abstractions are prohibited.

Remove abstractions with single usage, e.g.:

- `BaseService`
- `GenericRepository`
- `AbstractManager`

Rule:

> Abstraction must have **2+ real consumers** and reduce complexity.

Prefer clarity over “future reuse”.

---

## 9) Circular Dependency Prevention

Circular dependencies are forbidden (especially in NestJS modules).

Audit:

```bash
npx madge --circular src
```

Fix immediately.

---

## 10) API Surface Control

All endpoints must have verified consumers.

Agents must confirm:

- frontend usage
- integration usage
- webhook usage

Unused endpoints must be removed (reduces attack surface).

---

## 11) Environment Hygiene

Environment variables must remain clean.

Required:

- `.env.example` is accurate
- unused env vars removed
- secrets not duplicated or scattered

Rule:

> Env drift is forbidden.

---

## 12) Test Integrity

Tests must validate behavior, not implementation details.

Remove:

- flaky tests
- skipped tests
- snapshot abuse

Audit:

```bash
rg "\.skip\("
```

Rule:

> Tests must fail when behavior breaks.

---

## 13) Background Jobs & Workers Cleanup

Agents must audit:

- CRON jobs
- queues
- workers
- retry systems

Remove:

- unused queues
- abandoned jobs
- orphan workers

---

## 14) Documentation Accuracy

Documentation must reflect reality.

Outdated docs must be updated or removed.

Critical docs:

- architecture docs
- onboarding docs

Rule:

> Incorrect documentation is worse than missing documentation.

---

## 15) Feature Lifecycle Enforcement

Each feature must be:

- `active`
- `experimental`
- `deprecated`

Deprecated features must be scheduled for removal. Zombie features are forbidden.

---

## 16) Error Handling Standardization

Forbidden:

```ts
throw new Error()
```

Use domain errors (typed + meaningful), e.g.:

- `PaymentRequestNotFoundError`
- `LedgerIntegrityError`
- `AuthorizationFailedError`

---

## 17) AI-Agent Repo Safety Rule

Repository clarity directly affects AI correctness.

Agents MUST prioritize:

- predictable folder structure
- centralized types
- removal of ambiguity and duplication

Messy repos produce unsafe automated changes.

---

## 18) Mandatory Cleanup Audit Before Large Changes

Before major implementation, run:

```bash
npx knip
npx ts-prune
npx depcheck
npx madge --circular src
rg "TODO|FIXME"
rg "console\.log|console\.error"
```

---

## Prime Principle

> A clean repository is a **production safety mechanism**, not cosmetic work.
