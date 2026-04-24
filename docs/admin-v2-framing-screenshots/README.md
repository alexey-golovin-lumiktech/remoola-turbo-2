# Admin v2 Framing Screenshots

## Purpose
Эта папка хранит архивные снимки framing-layer, который был удален из runtime `apps/admin-v2`.

Снимки сделаны после временного возврата framing-слоя и до финального cleanup.

## Screenshots Index
### `sidebar-artifact-contract.png`
- Route: `http://localhost:3011/overview`
- Что фиксирует:
  - sidebar branding с `Derived pack-clean v2 prototype`
  - `Artifact contract` card
  - layer legend и queue/audit/case/derived pills
- Документирует:
  - `apps/admin-v2/src/components/sidebar-contents.tsx`
  - historical wording из `docs/admin_v_2_hybrid_pack_clean_v2_shell_preview.jsx`

### `overview-framing.png`
- Route: `http://localhost:3011/overview`
- Что фиксирует:
  - overview hero с `HEADER_CHIPS`
  - `Artifact contract` panel
  - `Responsive dense-surface strategy`
  - общее совместное расположение framing-элементов на landing page
- Документирует:
  - `apps/admin-v2/src/app/(shell)/overview/page.tsx`
  - `apps/admin-v2/src/components/mode-card.tsx`

### `verification-with-context-rail.png`
- Route: `http://localhost:3011/verification`
- Что фиксирует:
  - workspace page с правым `ContextRail`
  - секции `Linked context`, `Jump paths`, `Guardrails`
  - двухколоночную композицию `WorkspaceLayout`
- Документирует:
  - `apps/admin-v2/src/components/workspace-layout.tsx`
  - `apps/admin-v2/src/components/context-rail.tsx`
  - `apps/admin-v2/src/components/context-rail-data.ts`

### `login-historical-subtitle.png`
- Route: `http://localhost:3011/login`
- Что фиксирует:
  - historical login subtitle с shell taxonomy
- Документирует:
  - `apps/admin-v2/src/app/(auth)/login/page.tsx`

## Not Included
- attempted `context-rail-detail.png` crop не вошел в архив, потому что при захвате получился пустой файл.

## Files Edited Or Deleted During Final Cleanup
### Edited files
- `apps/admin-v2/src/components/sidebar-contents.tsx`
- `apps/admin-v2/src/app/(shell)/overview/page.tsx`
- `apps/admin-v2/src/components/workspace-layout.tsx`
- `apps/admin-v2/src/app/(auth)/login/page.tsx`
- `apps/admin-v2/src/app/layout.tsx`
- `docs/admin-v2-framing-archive.md`
- `docs/admin-v2-framing-manifest.json`
- `docs/admin-v2-framing-screenshots/README.md`

### Deleted files
- `apps/admin-v2/src/components/mode-card.tsx`
- `apps/admin-v2/src/components/context-rail.tsx`
- `apps/admin-v2/src/components/context-rail-data.ts`

## Related References
- `docs/admin-v2-framing-archive.md`
- `docs/admin-v2-framing-manifest.json`
- `docs/admin_v_2_hybrid_pack_clean_v2_shell_preview.jsx`
