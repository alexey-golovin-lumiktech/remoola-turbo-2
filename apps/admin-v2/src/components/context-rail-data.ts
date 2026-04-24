export type WorkspaceKey =
  | `overview`
  | `consumers`
  | `verification`
  | `payments`
  | `ledger`
  | `payouts`
  | `payment-methods`
  | `exchange`
  | `documents`
  | `audit/auth`
  | `audit/admin-actions`
  | `audit/consumer-actions`
  | `admins`
  | `system`;

export type ContextRailEntry = {
  workspace: WorkspaceKey;
  title: string;
  goal: string;
  primaryOperators: string[];
  secondaryOperators: string[];
  earliestActivePhase: string;
  whatToLookAtFirst: string[];
  learnMoreHref?: string;
  guardrails?: Array<{
    label: string;
    description?: string;
    status?: `ready` | `planned` | `blocked`;
  }>;
};

export const contextRailData: Record<WorkspaceKey, ContextRailEntry> = {
  overview: {
    workspace: `overview`,
    title: `Overview`,
    goal: `Дать ответ на вопрос: что требует внимания прямо сейчас.`,
    primaryOperators: [`Support, Ops`],
    secondaryOperators: [`Risk, Finance`],
    earliestActivePhase: `MVP-1b`,
    // Distilled from lines 35-46.
    whatToLookAtFirst: [
      `Pending verifications`,
      `Overdue payment requests`,
      `Ledger anomalies`,
      `Suspicious auth events`,
    ],
    learnMoreHref: `/admin-v2-pack/04-ops-workspaces-core.md#overview-workspace`,
  },
  consumers: {
    workspace: `consumers`,
    title: `Consumers`,
    goal: `Сделать consumer case page основным расследовательским хабом для support and ops.`,
    primaryOperators: [`Support, Ops`],
    secondaryOperators: [`Risk`],
    earliestActivePhase: `MVP-1a`,
    // Distilled from lines 174-219.
    whatToLookAtFirst: [
      `Email, name, or id search`,
      `Verification and account filters`,
      `Case hub cross-links`,
      `Flags, notes, force logout`,
    ],
    learnMoreHref: `/admin-v2-pack/04-ops-workspaces-core.md#consumers-workspace`,
  },
  verification: {
    workspace: `verification`,
    title: `Verification`,
    goal: `Поддержать review и decision workflows вокруг verification и risk context.`,
    primaryOperators: [`Risk, Ops`],
    secondaryOperators: [`Compliance`],
    earliestActivePhase: `MVP-1b`,
    // Distilled from lines 288-335.
    whatToLookAtFirst: [
      `PENDING, MORE_INFO, FLAGGED`,
      `Stripe Identity status`,
      `Missing profile data`,
      `Decision history and controls`,
    ],
    learnMoreHref: `/admin-v2-pack/04-ops-workspaces-core.md#verification-and-risk-workspace`,
    guardrails: [
      {
        label: `Idempotent verification retries`,
        description: `Повторная отправка того же кейса не создает второе решение.`,
        status: `ready`,
      },
      {
        label: `RBAC scoped to verification queue`,
        description: `Переходы статусов доступны только verification-capable operators.`,
        status: `ready`,
      },
      {
        label: `Audit trail emits action_id`,
        description: `Каждое решение пишет admin action с устойчивым action_id.`,
        status: `ready`,
      },
    ],
  },
  payments: {
    workspace: `payments`,
    title: `Payments`,
    goal: `Дать operations visibility в payment request lifecycle и смежные case relationships.`,
    primaryOperators: [`Ops`],
    secondaryOperators: [`Finance`],
    earliestActivePhase: `MVP-1c`,
    // Distilled from lines 35-93.
    whatToLookAtFirst: [`Overdue payment requests`, `UNCOLLECTIBLE requests`, `Ledger linkage`, `Status mismatches`],
    learnMoreHref: `/admin-v2-pack/05-financial-workspaces.md#payments-workspace`,
    guardrails: [
      {
        label: `No double-charge on retry`,
        description: `Повтор с тем же идемпотентным ключом не создает новый charge.`,
        status: `ready`,
      },
      {
        label: `Status transitions stay forward-only`,
        description: `Терминальные состояния не откатываются назад скрытыми переходами.`,
        status: `ready`,
      },
      {
        label: `Persisted vs effective mismatch surfaced`,
        description: `Расхождения видны операторам и не теряются в очереди.`,
        status: `ready`,
      },
    ],
  },
  ledger: {
    workspace: `ledger`,
    title: `Ledger and Disputes`,
    goal: `Дать безопасную и глубокую видимость в ledger activity, outcome timelines и dispute history.`,
    primaryOperators: [`Finance`],
    secondaryOperators: [`Ops`],
    earliestActivePhase: `MVP-1c`,
    // Distilled from lines 116-188.
    whatToLookAtFirst: [`Outcome timelines`, `Dispute history`, `Idempotency key risk`, `Inconsistent outcome chains`],
    learnMoreHref: `/admin-v2-pack/05-financial-workspaces.md#ledger-and-disputes-workspace`,
    guardrails: [
      {
        label: `Append-only entries`,
        description: `Исправления делаются через компенсирующие проводки, а не через редактирование.`,
        status: `ready`,
      },
      {
        label: `Balanced double-entry`,
        description: `Каждая запись суммируется к нулю между участвующими счетами.`,
        status: `ready`,
      },
      {
        label: `Anomaly review stays visible`,
        description: `Подозрительные цепочки и outcome drift остаются на поверхности расследования.`,
        status: `ready`,
      },
    ],
  },
  payouts: {
    workspace: `payouts`,
    title: `Payouts`,
    goal: `Собрать payout operations и review destination methods в отдельный operational surface.`,
    primaryOperators: [`Ops, Finance`],
    secondaryOperators: [],
    earliestActivePhase: `MVP-2`,
    // Distilled from lines 213-266.
    whatToLookAtFirst: [`Failed payouts`, `Stuck payouts`, `Destination payment method`, `Exact outcome timeline`],
    learnMoreHref: `/admin-v2-pack/05-financial-workspaces.md#payouts-and-payment-methods-workspace`,
    guardrails: [
      {
        label: `Bank reconciliation required`,
        description: `Завершение payout не считается окончательным без подтверждения банка.`,
        status: `ready`,
      },
      {
        label: `Settlement review stays ordered`,
        description: `Операторы разбирают зависшие и failed payout без потери возрастного контекста.`,
        status: `ready`,
      },
      {
        label: `Reversal remains distinct from cancel`,
        description: `До отправки и после отправки используются разные операционные ветки.`,
        status: `ready`,
      },
    ],
  },
  'payment-methods': {
    workspace: `payment-methods`,
    title: `Payment Methods`,
    goal: `Собрать payout operations и review destination methods в отдельный operational surface.`,
    primaryOperators: [`Ops, Finance`],
    secondaryOperators: [],
    earliestActivePhase: `MVP-2`,
    // Distilled from lines 268-305.
    whatToLookAtFirst: [
      `Type and default filters`,
      `Fingerprint grouping`,
      `Consumer linkage`,
      `Capability-gated detail writes`,
    ],
    learnMoreHref: `/admin-v2-pack/05-financial-workspaces.md#payouts-and-payment-methods-workspace`,
  },
  exchange: {
    workspace: `exchange`,
    title: `Exchange`,
    goal: `Дать operations и finance visibility в rates, auto-conversion rules и scheduled conversions.`,
    primaryOperators: [`Operations, Finance`],
    secondaryOperators: [],
    earliestActivePhase: `MVP-2`,
    // Distilled from lines 326-379.
    whatToLookAtFirst: [
      `Staleness indicators`,
      `Rule timing and errors`,
      `Scheduled conversion failures`,
      `Approval and retry safety`,
    ],
    learnMoreHref: `/admin-v2-pack/05-financial-workspaces.md#exchange-workspace`,
  },
  documents: {
    workspace: `documents`,
    title: `Documents`,
    goal: `Дать secure operational access к resources и tagging context.`,
    primaryOperators: [`Reviewer`],
    secondaryOperators: [`Ops`],
    earliestActivePhase: `Top-level breadth`,
    // Distilled from lines 401-435.
    whatToLookAtFirst: [
      `Owner consumer linkage`,
      `Payment request evidence`,
      `Tag coverage`,
      `Broken metadata or access`,
    ],
    learnMoreHref: `/admin-v2-pack/05-financial-workspaces.md#documents-workspace`,
  },
  'audit/auth': {
    workspace: `audit/auth`,
    title: `Audit / Auth`,
    goal: `Сделать auth и admin activities расследуемыми без прямой работы с логами инфраструктуры.`,
    primaryOperators: [`Compliance, Risk, Ops`],
    secondaryOperators: [`Super Admin`],
    earliestActivePhase: `MVP-1a`,
    // Distilled from lines 368-380.
    whatToLookAtFirst: [
      `Suspicious login spikes`,
      `Active lockouts context`,
      `Identity and email filters`,
      `IP and user-agent clues`,
    ],
    learnMoreHref: `/admin-v2-pack/04-ops-workspaces-core.md#audit-workspace`,
    guardrails: [
      {
        label: `Suspicious threshold stays tunable`,
        description: `Порог тревоги можно калибровать без поломки расследовательского потока.`,
        status: `ready`,
      },
      {
        label: `No raw PII in event payload`,
        description: `Чувствительные поля остаются минимизированными и пригодными для аудита.`,
        status: `ready`,
      },
      {
        label: `Retention window enforced`,
        description: `История auth events не накапливается бесконтрольно вне policy.`,
        status: `ready`,
      },
    ],
  },
  'audit/admin-actions': {
    workspace: `audit/admin-actions`,
    title: `Audit / Admin Actions`,
    goal: `Сделать auth и admin activities расследуемыми без прямой работы с логами инфраструктуры.`,
    primaryOperators: [`Compliance, Risk, Ops`],
    secondaryOperators: [`Super Admin`],
    earliestActivePhase: `MVP-1a`,
    // Distilled from lines 382-394.
    whatToLookAtFirst: [`Actor and action filters`, `Resource-type drilldown`, `Metadata review`, `Export-safe trail`],
    learnMoreHref: `/admin-v2-pack/04-ops-workspaces-core.md#audit-workspace`,
    guardrails: [
      {
        label: `Append-only audit log`,
        description: `История действий администратора не редактируется и не удаляется постфактум.`,
        status: `ready`,
      },
      {
        label: `Deterministic action identifiers`,
        description: `Повторное воспроизведение не порождает новый action identity.`,
        status: `ready`,
      },
      {
        label: `Resource typing stays explicit`,
        description: `Тип и идентификатор ресурса пригодны для drilldown и экспорта.`,
        status: `ready`,
      },
    ],
  },
  'audit/consumer-actions': {
    workspace: `audit/consumer-actions`,
    title: `Audit / Consumer Actions`,
    goal: `Сделать auth и admin activities расследуемыми без прямой работы с логами инфраструктуры.`,
    primaryOperators: [`Compliance, Risk, Ops`],
    secondaryOperators: [`Super Admin`],
    earliestActivePhase: `MVP-1a`,
    // Distilled from lines 395-419.
    whatToLookAtFirst: [`Device timeline`, `Correlation chain`, `Mandatory date range`, `IP and resource context`],
    learnMoreHref: `/admin-v2-pack/04-ops-workspaces-core.md#audit-workspace`,
  },
  admins: {
    workspace: `admins`,
    title: `Admins`,
    goal: `Дать super admin безопасный способ управлять internal admin access.`,
    primaryOperators: [`Super Admin`],
    secondaryOperators: [],
    earliestActivePhase: `Later operational breadth`,
    // Distilled from lines 32-75.
    whatToLookAtFirst: [
      `Active and inactive admins`,
      `Role and type visibility`,
      `Recent actions`,
      `Lifecycle audit trail`,
    ],
    learnMoreHref: `/admin-v2-pack/06-admin-and-system.md#admins-workspace`,
  },
  system: {
    workspace: `system`,
    title: `System`,
    goal: `Дать полезную operational visibility без превращения admin v2 в полноценную infra platform.`,
    primaryOperators: [`Operational team`],
    secondaryOperators: [],
    earliestActivePhase: `Maturity phase`,
    // Distilled from lines 83-139.
    whatToLookAtFirst: [`Webhook health`, `Scheduler health`, `Email issue patterns`, `Stale exchange alerts`],
    learnMoreHref: `/admin-v2-pack/06-admin-and-system.md#system-workspace`,
  },
};
