# CHANGELOG Guide

## Purpose

`CHANGELOG.md` is a human-readable historical record of what changed in the repository and why it matters.

It is not:

- a raw git log
- a dump of commit subjects
- a place for speculative or unverified claims

The goal is to preserve facts, group them clearly, and keep the file readable over time.

## Canonical Structure

Keep the top-level monthly navigation in `CHANGELOG.md` unchanged:

```md
# Changelog

- [September 2025](#changelog-september-2025) · ...
```

Each month should remain wrapped in its own `<details>` block:

```md
<details>
<summary><strong>Changelog (April 2026)</strong></summary>

# Changelog (April 2026)

...

</details>
```

Each day inside a month must use the same format:

```md
<details>
<summary>YYYY-MM-DD</summary>

- **YYYY-MM-DD:**

  ### 🚀 Feature
  - **Theme:** factual summary

  ### 🔐 Security / Production Safety
  - **Theme:** factual summary

  ### 🗄 Database & Migrations
  - **Theme:** factual summary

  ### 🧪 Testing
  - **Theme:** factual summary

  ### ⚡️ Performance
  - **Theme:** factual summary

  ### 🛠 DevEx
  - **Theme:** factual summary

  ### 📄 Documentation
  - **Theme:** factual summary

  ### ⚠️ Notes
  - **Theme:** factual summary

</details>
```

Only include sections that are relevant for that specific day.

## Required Style Rules

### 1. Write by day, not by commit

Do not paste commit subjects verbatim.

Bad:

```md
- fix(admin-v2): align workspace metadata and shared format helpers
- fix(admin-v2): remove implicit localhost origin fallback
```

Good:

```md
### 🔐 Security / Production Safety

- **Request-origin hardening:** Remove the implicit localhost origin fallback from the admin-v2 request-origin path and require explicit origin resolution through the supported env/config surface.

### 🛠 DevEx

- **Shared metadata alignment:** Extract shared workspace metadata and formatting helpers so anomaly classes, alert workspaces, and saved-view paths do not drift across admin-v2 surfaces.
```

### 2. Preserve facts only

Never invent:

- migrations that did not land
- tests that did not run
- risk mitigations that are not grounded in the code
- rollout notes that are not implied by the change

If a fact is uncertain, omit it or keep it generic.

### 3. Use one bullet style consistently

Preferred style:

```md
- **Theme:** factual summary
```

Do not mix all of these inside one day:

- raw bullets
- commit subjects
- prose paragraphs
- nested pseudo-headings without sections

### 4. Group related commits into one theme

If 3 commits all advance the same slice, write one aggregated bullet.

Example:

- one feature bullet for a multi-commit quickstarts rollout
- one testing bullet for related page/service coverage
- one devex bullet for config or generator alignment

### 5. Keep section semantics stable

Use the same meaning every time:

- `Feature`: user-visible behavior, new slices, expanded flows, functional fixes that materially change product behavior
- `Security / Production Safety`: auth/cookies/session handling, payment/ledger safety, rollout invariants, drift prevention, backend-unavailable vs forbidden semantics, risk mitigation
- `Database & Migrations`: Prisma/schema/migration/backfill/DB rollout notes
- `Testing`: tests added, updated, or revalidated
- `Performance`: profiling, query-shape changes, budgets, planner/index evidence
- `DevEx`: tooling, config, generators, lint/typecheck/build ergonomics, reusable primitives, refactors that mainly reduce maintenance cost
- `Documentation`: docs, guides, reconciliations, runbooks, changelog-only narrative updates
- `Notes`: constraints, anti-scope, follow-up warnings, coordination caveats

## How To Summarize Commits

When preparing a new day:

1. Read all commits for that date.
2. Cluster them by topic.
3. Identify which clusters are:
   - product-facing
   - safety-sensitive
   - migration-related
   - tests
   - tooling/docs
4. Write one concise bullet per cluster.

## Hash Usage

Commit hashes are optional.

Use them only when they help:

- when one specific commit is being referenced for a notable follow-up
- when a generated sync or isolated fix is easier to anchor with a hash

If hashes are used, keep the style consistent:

```md
- **Theme:** summary (`abcd1234`)
```

Do not spam hashes on every line if they add no value.

## Writing Guidelines

Prefer:

- `add`
- `align`
- `harden`
- `refactor`
- `migrate`
- `normalize`
- `expand`
- `preserve`
- `reduce drift`
- `keep ... in sync`

Avoid:

- `misc`
- `various fixes`
- `cleanup` without saying what was cleaned up
- `improved` without naming what changed
- overclaiming production guarantees you did not verify

## Early / Low-Information Days

Some older days have very little detail available.

For those days:

- keep the same day structure
- use only the sections that are justified
- do not inflate a one-line fact into a long narrative

Compact example:

```md
<details>
<summary>2025-09-09</summary>

- **2025-09-09:**

  ### 🗄 Database & Migrations
  - **TypeORM migration fixes:** Correct UUID migration behavior and foreign-key adjustments.

</details>
```

## Checklist Before Editing `CHANGELOG.md`

- Facts preserved
- No invented migrations/tests/rollout claims
- Day uses canonical section format
- Sections are ordered consistently
- Bullet style is consistent
- Monthly wrapper structure is still valid
- Only the latest day should normally remain `<details open>`

## Default Section Order

Always use this order when a section is present:

1. `Feature`
2. `Security / Production Safety`
3. `Database & Migrations`
4. `Testing`
5. `Performance`
6. `DevEx`
7. `Documentation`
8. `Notes`
