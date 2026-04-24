# Admin v2 Framing Archive

## Purpose
Этот документ сохраняет финально удаленный framing-layer из `apps/admin-v2/src` в форме, удобной для:
- восстановления UI без чтения старых diff;
- исторической фиксации того, что было расположено, где именно, и зачем;
- быстрого поиска исходных формулировок, visual references и удаленных runtime-файлов.

Текущий статус: framing-layer удален из runtime-кода. История и путь восстановления сохранены только в `docs/`.

## Archive Shape
Архив состоит из:
- этого документа как человеко-читаемого досье;
- `docs/admin-v2-framing-manifest.json` как структурированного manifest;
- `docs/admin-v2-framing-screenshots/` как папки с архивными снимками.

Основной visual/spec reference по-прежнему:
- `docs/admin_v_2_hybrid_pack_clean_v2_shell_preview.jsx`

## Captured Screenshots
Снятые перед финальным cleanup кадры:
- `docs/admin-v2-framing-screenshots/sidebar-artifact-contract.png`
- `docs/admin-v2-framing-screenshots/overview-framing.png`
- `docs/admin-v2-framing-screenshots/verification-with-context-rail.png`
- `docs/admin-v2-framing-screenshots/login-historical-subtitle.png`

Отдельный детальный crop для `ContextRail` не включен в архив: при захвате был создан пустой файл, поэтому в итоговый пакет вошел рабочий общий снимок workspace page с rail.

## Cleanup Summary
### Edited runtime files
- `apps/admin-v2/src/components/sidebar-contents.tsx`
- `apps/admin-v2/src/app/(shell)/overview/page.tsx`
- `apps/admin-v2/src/components/workspace-layout.tsx`
- `apps/admin-v2/src/app/(auth)/login/page.tsx`
- `apps/admin-v2/src/app/layout.tsx`

### Deleted runtime files
- `apps/admin-v2/src/components/mode-card.tsx`
- `apps/admin-v2/src/components/context-rail.tsx`
- `apps/admin-v2/src/components/context-rail-data.ts`

### Edited docs
- `docs/admin-v2-framing-archive.md`
- `docs/admin-v2-framing-manifest.json`
- `docs/admin-v2-framing-screenshots/README.md`

## Runtime Sources Before Removal
Основные runtime-файлы, из которых состоял framing-layer до cleanup:
- `apps/admin-v2/src/components/sidebar-contents.tsx`
- `apps/admin-v2/src/app/(shell)/overview/page.tsx`
- `apps/admin-v2/src/components/mode-card.tsx`
- `apps/admin-v2/src/components/context-rail.tsx`
- `apps/admin-v2/src/components/context-rail-data.ts`
- `apps/admin-v2/src/components/workspace-layout.tsx`
- `apps/admin-v2/src/app/(auth)/login/page.tsx`
- `apps/admin-v2/src/app/layout.tsx`

## Restoration Defaults
Если потребуется быстро вернуть framing-layer, базовая последовательность такая:
1. вернуть `Artifact contract` в `sidebar-contents.tsx`;
2. вернуть `HEADER_CHIPS`, `Artifact contract` panel и `ModeCard` в `overview/page.tsx`;
3. воссоздать `ContextRail`, `context-rail-data.ts` и двухколоночный layout в `workspace-layout.tsx`;
4. вернуть framing-copy в `app/(auth)/login/page.tsx` и `app/layout.tsx`;
5. использовать screenshots из `docs/admin-v2-framing-screenshots/` как визуальную опору;
6. свериться с `docs/admin_v_2_hybrid_pack_clean_v2_shell_preview.jsx` как с canonical visual reference artifact.

## Block: Artifact Contract
### Final Status
Removed from runtime.

### Purpose
Объяснял, как безопасно читать `Admin v2` как derived/illustrative surface, а не как источник канонической shell-truth.

### Rendered In Before Removal
- `apps/admin-v2/src/components/sidebar-contents.tsx`
- `apps/admin-v2/src/app/(shell)/overview/page.tsx`

### What It Contained
- pills: `queue-first`, `audit-first`, `case-first`, `derived artifact`;
- explanatory copy про illustrative interpretation artifact;
- layer legend:
  - `Operational signals`
  - `Domain reads`
  - `Audit explorers`
  - `Derived chrome`

Overview-версия содержала упрощенную реплику того же контракта:
- `queue-first`: Workspaces driven by SLA-bound queues.
- `audit-first`: Workspaces backed by append-only audit trails.
- `case-first`: Workspaces grouping signals into operator cases.
- `derived artifact`: Workspaces computed from upstream signals.

### Why It Existed
- ограничивал неправильное чтение UI как planning truth;
- связывал runtime shell с markdown pack;
- задавал vocabulary слоя: queue-first, audit-first, case-first, derived artifact.

### Why It Was Removed
- блок слишком сильно задавал интерпретацию интерфейса;
- финальный runtime должен остаться operational и нейтральным;
- тот же смысл безопаснее хранить в docs, а не в рабочем UI.

### Historical References
- `docs/admin_v_2_hybrid_pack_clean_v2_shell_preview.jsx`
- `docs/admin-v2-framing-screenshots/sidebar-artifact-contract.png`
- `docs/admin-v2-framing-screenshots/overview-framing.png`

### Key Historical Wording
`This surface is an illustrative interpretation artifact. Canonical planning, phase-specific navigation, and route-family truth remain in the markdown pack.`

### Restore Path
1. восстановить sidebar card в `sidebar-contents.tsx`;
2. восстановить overview panel и `HEADER_CHIPS`;
3. использовать screenshots и preview artifact для визуального выравнивания;
4. восстановить texts и labels из этого архива.

## Block: Responsive Dense-Surface Strategy
### Final Status
Removed from runtime and component file deleted.

### Purpose
Фиксировал intended responsive behavior листинговых поверхностей: mobile stack, tablet rows, desktop dense table.

### Rendered In Before Removal
- `apps/admin-v2/src/components/mode-card.tsx`
- `apps/admin-v2/src/app/(shell)/overview/page.tsx`

### What It Contained
- `Mobile stack`: `< 768px - vertical queue cards, tappable rows, single-column reading flow.`
- `Tablet rows`: `768-1279px - compact 2-3 col rows with primary metadata inline.`
- `Desktop dense table`: `>= 1280px - full table with all columns, pagination, sorting.`

### Why It Existed
- делал responsive strategy явной и общей для workspaces;
- служил operator-facing summary того, как листинги деградируют между breakpoint-режимами.

### Why It Was Removed
- в финальном runtime это explanatory layer, а не рабочий UI;
- после cleanup отдельный runtime-компонент больше не имеет usage.

### Historical References
- `docs/admin_v_2_hybrid_pack_clean_v2_shell_preview.jsx`
- `docs/admin-v2-framing-screenshots/overview-framing.png`

### Restore Path
1. заново создать `apps/admin-v2/src/components/mode-card.tsx`;
2. вернуть импорт и размещение рядом с `Frequent investigation starts` в `overview/page.tsx`;
3. использовать этот архив как source для text content.

## Block: ContextRail
### Final Status
Removed from runtime; component and data-layer files deleted.

### Purpose
Давал workspace-specific explanatory rail: что это за surface, кто им пользуется, на что смотреть сначала и какие guardrails сохранять во время расследования.

### Runtime Structure Before Removal
- точка подключения: `apps/admin-v2/src/components/workspace-layout.tsx`
- компонент: `apps/admin-v2/src/components/context-rail.tsx`
- смысловой data-layer: `apps/admin-v2/src/components/context-rail-data.ts`

### Pages Covered Through WorkspaceLayout
- `apps/admin-v2/src/app/(shell)/consumers/page.tsx`
- `apps/admin-v2/src/app/(shell)/verification/page.tsx`
- `apps/admin-v2/src/app/(shell)/payments/page.tsx`
- `apps/admin-v2/src/app/(shell)/ledger/page.tsx`
- `apps/admin-v2/src/app/(shell)/payouts/page.tsx`
- `apps/admin-v2/src/app/(shell)/payment-methods/page.tsx`
- `apps/admin-v2/src/app/(shell)/exchange/page.tsx`
- `apps/admin-v2/src/app/(shell)/exchange/rates/page.tsx`
- `apps/admin-v2/src/app/(shell)/exchange/rules/page.tsx`
- `apps/admin-v2/src/app/(shell)/exchange/scheduled/page.tsx`
- `apps/admin-v2/src/app/(shell)/documents/page.tsx`
- `apps/admin-v2/src/app/(shell)/documents/tags/page.tsx`
- `apps/admin-v2/src/app/(shell)/audit/page.tsx`
- `apps/admin-v2/src/app/(shell)/audit/auth/page.tsx`
- `apps/admin-v2/src/app/(shell)/audit/admin-actions/page.tsx`
- `apps/admin-v2/src/app/(shell)/audit/consumer-actions/page.tsx`
- `apps/admin-v2/src/app/(shell)/admins/page.tsx`
- `apps/admin-v2/src/app/(shell)/system/page.tsx`

### Subsections
#### Linked Context
Показывал:
- `Primary operators`
- `Secondary operators`
- `Earliest active phase`

#### Jump Paths
Показывал `whatToLookAtFirst` как быстрые deep links.

#### Guardrails
Показывал:
- workspace-specific `guardrails`, если они были;
- fallback guardrails:
  - `Idempotent operations`
  - `Append-only audit`
  - `RBAC scoped`

### Why It Existed
- связывал экран с его intended operator смыслом;
- делал расследовательский контекст доступным без перехода в отдельную документацию;
- удерживал workspace-specific guardrails рядом с основным экраном.

### Why It Was Removed
- это был самый “объясняющий” слой интерфейса;
- правый rail менял композицию всего runtime и делал surfaces менее нейтральными;
- после cleanup от него осталась историческая и восстановительная ценность, но не runtime-необходимость.

### Historical References
- `docs/admin_v_2_hybrid_pack_clean_v2_shell_preview.jsx`
- `docs/admin-v2-framing-screenshots/verification-with-context-rail.png`

### Context Data Notes
Удаленный `context-rail-data.ts` содержал почти всю восстановимую семантику слоя:
- `goal`
- `primaryOperators`
- `secondaryOperators`
- `earliestActivePhase`
- `whatToLookAtFirst`
- `learnMoreHref`
- `guardrails`

### Restore Path
1. заново создать `context-rail.tsx` и `context-rail-data.ts`;
2. вернуть imports и `entry` resolution в `workspace-layout.tsx`;
3. вернуть двухколоночный grid и `aside` с rail;
4. использовать screenshots и preview artifact для layout/composition;
5. использовать этот архив и manifest как source для data schema и text content.

## Block: Login Framing Subtitle
### Final Status
Removed from runtime login copy.

### Historical Text
`Canonical MVP-2 shell keeps Overview, Consumers, Verification, Payments, Ledger and Audit primary. Exchange and Documents remain top-level breadth, Admins stays later breadth for eligible super-admin identities, and Payouts plus Payment Methods stay nested finance investigation routes. System remains outside MVP-2.`

### Why It Existed
- объяснял shell taxonomy еще до входа в систему;
- делал IA-visible уже на login screen.

### Why It Was Removed
- login screen лучше работает с нейтральной product copy;
- историческая ценность текста выше, чем его runtime-польза.

### Historical References
- `docs/admin-v2-framing-screenshots/login-historical-subtitle.png`

### Restore Path
1. вернуть subtitle в `apps/admin-v2/src/app/(auth)/login/page.tsx`;
2. при необходимости сократить текст, если нужен компромисс между историей и UX.

## Block: App Metadata Shell Framing
### Final Status
Removed from runtime metadata.

### Historical Text
`Operational admin console with canonical MVP-2 shell framing across core ops, top-level breadth, later admin breadth, and nested finance investigation routes`

### Why It Existed
- делал shell taxonomy видимой даже вне page body;
- согласовывал metadata с conceptual framing.

### Why It Was Removed
- metadata сейчас держится в нейтральной product form;
- shell taxonomy полезнее в docs и archive, чем в runtime metadata.

### Restore Path
1. вернуть historical description в `apps/admin-v2/src/app/layout.tsx`;
2. при необходимости использовать как internal/product documentation copy.

## Practical Restore Query
Для техничного восстановления сначала искать:

```bash
rg "Artifact contract|Responsive dense-surface strategy|ContextRail|queue-first|derived artifact" docs apps/admin-v2
```

Потом сверяться с:
- `docs/admin-v2-framing-manifest.json`
- `docs/admin-v2-framing-screenshots/README.md`
- `docs/admin_v_2_hybrid_pack_clean_v2_shell_preview.jsx`
