# Consumer-mobile

Mobile-first Next.js App Router app for Remoola consumers. Runs on port **3002**.

## Development

```bash
yarn dev
# or from repo root: yarn dev:consumer-mobile
```

Open [http://localhost:3002](http://localhost:3002). Unauthenticated users are redirected to `/login`.

## Scripts

- `yarn dev` — start dev server (Turbopack, port 3002)
- `yarn build` — production build
- `yarn start` — run production server
- `yarn lint` / `yarn lint --fix` — ESLint
- `yarn typecheck` — TypeScript check
- `yarn test` — unit + integration tests

## Design Rules & Documentation

**⭐ Essential for all development:**

- **[docs/DESIGN_RULES.md](docs/DESIGN_RULES.md)** — Canonical design rules for Cursor agents (START HERE)
- **[docs/DESIGN_RULES_SUMMARY.md](docs/DESIGN_RULES_SUMMARY.md)** — One-page quick reference

**Key documentation:**
- [docs/error-handling/](docs/error-handling/) — Error handling, toast patterns, logging
- [docs/ui-ux/](docs/ui-ux/) — Mobile-first UI patterns, components, accessibility
- [docs/logging/](docs/logging/) — PII protection, structured logging
- [docs/technical/](docs/technical/) — Implementation guides, refactoring notes
- [docs/features/](docs/features/) — Feature-specific documentation

## E2E scope

See [docs/E2E_SCOPE.md](docs/E2E_SCOPE.md) for critical flows to cover when adding E2E tests.

## Governance

This app follows:
- [governance/05_WEBAPP_NEXTJS_RULES.md](../../governance/05_WEBAPP_NEXTJS_RULES.md) — Fintech hardening rules
- [governance/06_WEBAPP_NEXTJS_STRICT_RULES.md](../../governance/06_WEBAPP_NEXTJS_STRICT_RULES.md) — Next.js strict rules
- [governance/MOBILE_FIRST_MODAL_ALTERNATIVES_NEXTJS.md](../../governance/MOBILE_FIRST_MODAL_ALTERNATIVES_NEXTJS.md) — Mobile UX patterns

All new features must comply with [docs/DESIGN_RULES.md](docs/DESIGN_RULES.md).
