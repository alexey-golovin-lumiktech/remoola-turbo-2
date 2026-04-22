# admin-v2 shell-uplift SLICE-001 — design tokens and status pills

## Summary

Land the dark-shell design tokens (color, radius, spacing) in
`apps/admin-v2/src/app/globals.css`, ship three new pill components
(`StatusPill`, `PriorityPill`, `TinyPill`) under
`apps/admin-v2/src/components/`, and wire `StatusPill` into the
`/payments` triple-render as the canonical reference. Establishes the
visual vocabulary every later admin-v2-shell-uplift slice (002-008)
inherits.

Spec: [`admin-v2-shell-uplift-pack/SLICE-001-design-tokens-and-status-pills.md`](../admin-v2-shell-uplift-pack/SLICE-001-design-tokens-and-status-pills.md).

Pill components mounted only on /payments as canonical reference; other workspaces frozen for SLICE-006.

`--muted` and `--danger` CSS tokens preserved verbatim per cross-slice non-negotiable.

No backend, no DTO, no migration; tone semantics encoded in CSS only.

`scripts/admin-v2-gates/config.mjs` untouched; this slice is not gate-bearing.

## Implemented

- Commit `8821dd62` — retarget existing `:root` tokens to the SHARED-DESIGN-CONTRACT §1 dark-shell palette and add the new tokens enumerated in §1 / §2 (`--panel-elevated`, `--border-strong`, `--text-muted-{72,56,40}`, `--accent-{soft,strong}`, `--tone-{rose,amber,emerald,cyan,neutral}-{fg,bg,border}`, `--radius-{pill,card,shell,input}`, `--space-{1..6}`). `--muted` and `--danger` declarations preserved verbatim. Five additive `.pill[data-tone="rose|amber|emerald|cyan|neutral"]` rules and one `.pill[data-density="tight"]` rule appended; the existing `.pill` base rule and all current `.pill` consumers stay byte-for-byte unchanged because the new rules only match when the corresponding `data-*` attribute is present.
- Commit `7d794aad` — three new server components in `apps/admin-v2/src/components/`: `status-pill.tsx`, `priority-pill.tsx`, `tiny-pill.tsx`. All three emit `<span class="pill" data-tone={tone}>` so they compose with the existing `.pill` base rather than introducing a parallel class hierarchy. `TinyPill` additionally emits `data-density="tight"`. No `'use client'`, no hooks, no client-side state.
- Commit `61b15144` — wire `StatusPill` into `apps/admin-v2/src/app/(shell)/payments/page.tsx`. Two call-site edits cover all three breakpoints: `PaymentStatus` (used by both `PaymentsMobileCards` and `PaymentsTabletRows`) and `PaymentsDesktopTable` (the inline desktop status cell). Persisted-status muted line and stale-warning line stay verbatim. `PriorityPill` is intentionally not wired here because the payments list does not surface priority; that wiring lands when a list with priority opts in via SLICE-006.
- This commit — reconciliation note.

## Verification

- `yarn workspace @remoola/admin-v2 run typecheck` — pass (`tsc --noEmit`, 9.7s).
- `yarn workspace @remoola/admin-v2 run lint` — pass (`eslint --max-warnings 0`, 5.5s).
- `yarn workspace @remoola/admin-v2 run test` — 27/27 suites pass, 72/72 tests pass, no test changes required. Status-text assertions (e.g. on the `/payments/operations` sibling test) still match because `StatusPill` renders the status string verbatim inside its `<span>`.
- `yarn workspace @remoola/admin-v2 run build` — pass (clean rebuild after removing `.next`, 44s; `/payments`, `/payments/[paymentRequestId]`, `/payments/operations` all built).
- Pre-commit `admin-v2-gates` ran on every commit and passed. `typecheck-staged` ran on the TS commits (commits 2 and 3) and passed.
- `git diff --stat HEAD~4..HEAD apps/admin-v2 docs` — limited to the five paths called out in the slice §120 verification: `globals.css`, three new `components/*-pill.tsx` files, `(shell)/payments/page.tsx`, and this reconciliation note.

Note: slice prose says `pnpm --filter admin-v2 …`; the repo packageManager is `yarn@1.22.22` per `package.json`, so the equivalent `yarn workspace @remoola/admin-v2 run …` form was used. Same compilers, same gates.

Decision: the four Unique Decisions from `admin-v2-shell-uplift-pack/SLICE-001-design-tokens-and-status-pills.md` §73-§102 are honored verbatim. (1) Pill components compose with the existing `.pill` class via `<span class="pill" data-tone={tone}>` rather than introducing a parallel class hierarchy. (2) All three components are server components — no `'use client'`, no hooks, no client-side state. (3) `null` / `undefined` / empty `status`/`priority` renders a neutral `<span class="pill" data-tone="neutral">—</span>` so dense-table column widths stay stable. (4) `--muted` and `--danger` stay declared in `:root` even though the new `--text-muted-*` ramp and `--tone-rose-fg` could replace them; the cross-slice no-deletion rule applies to CSS tokens too. No deviations from these four decisions.

## Follow-ups

### Closed follow-ups

- None. SLICE-001 closes its own scope completely.

### Discovered while exploring

- `apps/admin-v2/src/components/` already exists with one prior file (`assignment-card.tsx`); SLICE-001 §47 "Observed Current State" claimed the directory does not yet exist. Description-only drift; behavior unaffected. New pill files coexist with the prior component.
- `apps/admin-v2/src/app/(shell)/payments/page.test.tsx` does not currently exist; only `apps/admin-v2/src/app/(shell)/payments/operations/page.test.tsx` exists in the payments scope. SLICE-001 §115 "Verification" referenced the non-existent test as one that "continues to pass without modification". Nothing to break; the operations sibling test still passes unchanged.
- The live `.pill` rule in `globals.css` (lines 181-188 prior to this slice) had an extra `align-items: center` declaration not enumerated in SLICE-001 §44. Cosmetic description gap only; SHARED-DESIGN-CONTRACT §6 still holds because the property is preserved verbatim by this slice and no rule was changed in a way that breaks an existing call site.
- The first two `yarn workspace @remoola/admin-v2 run build` attempts failed during "Collecting page data ..." with `PageNotFoundError` for unrelated routes (`/_document`, `/documents/[documentId]`) — symptom of stale `.next/server/pages` content from prior Turbopack runs. A clean `rm -rf apps/admin-v2/.next && build` succeeded. Not a §15 trigger #3 case (CSS pipeline did not reject the new `:root` declarations; `✓ Compiled successfully` was reported on every attempt).

### Frozen workspace (untouched)

The following workspaces deliberately did NOT adopt the new pill components in this slice; their status/priority text stays as-is until later slices opt them in:

- `/overview` — frozen until SLICE-005 (overview reshape).
- `/admins`, `/admins/[adminId]`, `/admins/...` — frozen for SLICE-006 (responsive triple-render rollout).
- `/audit/auth`, `/audit/...` — frozen for SLICE-008 (audit shell layout).
- `/consumers`, `/consumers/[consumerId]` — frozen for SLICE-006.
- `/verification`, `/verification/[consumerId]` — frozen for SLICE-006.
- `/payment-methods`, `/payment-methods/[paymentMethodId]` — frozen for SLICE-006.
- `/payouts`, `/payouts/[payoutId]` — frozen for SLICE-006.
- `/payments/operations`, `/payments/[paymentRequestId]` — frozen for SLICE-006 (only the `/payments` list itself is wired in this slice).
- `/exchange/...`, `/ledger/...`, `/documents/...`, `/system/...`, `/me/sessions` — frozen for SLICE-006 / SLICE-008.

Sidebar / identity panel restyle, desktop top header, mobile shell, context rail, audit shell layout, light theme tokens, typography tokens, and icon library selection are all out of scope for SLICE-001 (see slice §157-§168).

`scripts/admin-v2-gates/config.mjs` untouched; this slice is not gate-bearing.
