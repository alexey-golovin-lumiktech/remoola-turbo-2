import React, { useMemo, useState } from 'react';

const coreWorkspaces = [
  {
    path: '/overview',
    label: 'Overview',
    shortLabel: 'Overview',
    icon: '⌂',
    queue: '6 live overview signals',
    note: 'Phase-aware operational summary',
  },
  {
    path: '/consumers',
    label: 'Consumers',
    shortLabel: 'Consumers',
    icon: '◌',
    queue: '28 active cases',
    note: 'Case hub for support and ops',
  },
  {
    path: '/verification',
    label: 'Verification and Risk',
    shortLabel: 'Verify',
    icon: '✓',
    queue: '9 decisions due',
    note: 'Decision-heavy review surface',
  },
  {
    path: '/payments',
    label: 'Payments',
    shortLabel: 'Payments',
    icon: '◫',
    queue: '14 overdue',
    note: 'Request lifecycle investigation',
  },
  {
    path: '/ledger',
    label: 'Ledger and Disputes',
    shortLabel: 'Ledger',
    icon: '≣',
    queue: '6 open disputes',
    note: 'Immutable entry and dispute context',
  },
  {
    path: '/audit',
    label: 'Audit',
    shortLabel: 'Audit',
    icon: '▣',
    queue: '47 recent events',
    note: 'Shell bucket over canonical audit explorer routes',
  },
];

const phaseVisibleWorkspaces = [
  {
    path: '/exchange',
    label: 'Exchange',
    shortLabel: 'FX',
    icon: '⇄',
    queue: 'Phase-visible breadth',
    note: 'MVP-2 top-level destination, but visually lighter than the core shell',
  },
];

const topLevelBreadthWorkspaces = [
  {
    path: '/documents',
    label: 'Documents',
    shortLabel: 'Docs',
    icon: '▤',
    queue: 'Top-level breadth',
    note: 'Evidence review remains breadth, but not maturity-only',
  },
];

const laterBreadthWorkspaces = [
  {
    path: '/admins',
    label: 'Admins',
    shortLabel: 'Admins',
    icon: '⚙',
    queue: 'Later breadth',
    note: 'Governance visibility after core shell is stable',
  },
];

const maturityWorkspaces = [
  {
    path: '/system',
    label: 'System',
    shortLabel: 'System',
    icon: '◎',
    queue: 'Maturity layer',
    note: 'Cross-domain diagnostics only',
  },
];

const artifactLayers = [
  {
    label: 'Artifact intent',
    value: 'Derived visual interpretation artifact only. Canonical planning and phase gates stay in the markdown pack.',
  },
  {
    label: 'Target workspace map',
    value: 'The full target map remains larger than any single shell reading: Payouts, Exchange, Documents, Admins and System keep their own canonical roles.',
  },
  {
    label: 'Phase nav vs clean reading',
    value: 'This preview shows a target-state-clean shell reading with phase-visible breadth. It does not redefine canonical screen map or route-family tiers.',
  },
  {
    label: 'Route semantics',
    value: '`/audit` is rendered here as a shell bucket wrapping canonical explorers, not as a replacement source of route truth.',
  },
];

const mobileSecondaryWorkspaces = [
  ...phaseVisibleWorkspaces,
  ...topLevelBreadthWorkspaces,
  ...laterBreadthWorkspaces,
  ...maturityWorkspaces,
];

const mobileNavItems = [
  { path: '/overview', label: 'Home', icon: '⌂' },
  { path: '/consumers', label: 'Cases', icon: '◌' },
  { path: '/verification', label: 'Verify', icon: '✓' },
  { path: '/payments', label: 'Pay', icon: '◫' },
  { path: '/ledger', label: 'Ledger', icon: '≣' },
  { path: '/audit', label: 'Audit', icon: '▣' },
];

const frequentInvestigationStarts = [
  {
    label: 'Verification SLA watch',
    summary: 'Fast entry pattern into an already-operational queue, not a persistent maturity feature',
    query: 'Verification and Risk · severity:high · decisionWindow:<6h',
  },
  {
    label: 'Collections stale status sweep',
    summary: 'Operator shortcut into payment triage where persisted and effective status diverge',
    query: 'Payments · effectiveStatus:OVERDUE · staleWarning:true',
  },
  {
    label: 'Force logout reconstruction',
    summary: 'Audit-first path into a regulated core-ops action with immediate consumer context',
    query: 'Audit · action:consumer_force_logout · 24h',
  },
];

const activeSignals = [
  {
    key: 'pending_verifications',
    label: 'Pending verifications',
    value: '28',
    phaseStatus: 'live-actionable',
    availability: 'available',
    urgency: '7 breach SLA in next 6h',
    href: '/verification?queue=pending',
  },
  {
    key: 'suspicious_auth_events',
    label: 'Suspicious auth events',
    value: '5',
    phaseStatus: 'live-actionable',
    availability: 'available',
    urgency: '2 actors need reconstruction',
    href: '/audit?scope=auth',
  },
  {
    key: 'recent_admin_actions',
    label: 'Recent admin actions',
    value: '47',
    phaseStatus: 'live-actionable',
    availability: 'available',
    urgency: '3 sensitive decisions should be reviewed',
    href: '/audit?scope=admin-actions',
  },
  {
    key: 'overdue_payment_requests',
    label: 'Overdue payment requests',
    value: '14',
    phaseStatus: 'live-actionable',
    availability: 'available',
    urgency: 'Payment queue is active; overdue work should open the operational list',
    href: '/payments?view=overdue',
  },
  {
    key: 'uncollectible_requests',
    label: 'Uncollectible requests',
    value: '3',
    phaseStatus: 'live-actionable',
    availability: 'available',
    urgency: 'Collections outcome queue is visible in the same operational shell',
    href: '/payments?view=uncollectible',
  },
  {
    key: 'open_disputes',
    label: 'Open disputes',
    value: 'Unavailable',
    phaseStatus: 'live-actionable',
    availability: 'temporarily-unavailable',
    urgency: 'Disputes are phase-active here, but delivery failed right now and must not collapse to zero',
    href: '/ledger?view=disputes',
  },
];

const plannedSignals = [
  {
    key: 'failed_scheduled_fx',
    label: 'Failed scheduled FX',
    target: 'Exchange workspace',
    note: 'Phase-visible breadth after exchange activation, but still not part of the active pressure grid',
  },
  {
    key: 'stale_exchange_rates',
    label: 'Stale exchange rates',
    target: 'Exchange workspace',
    note: 'Exchange is visible as breadth, while these diagnostics remain outside the active core pressure surface',
  },
  {
    key: 'ledger_anomalies',
    label: 'Ledger anomalies',
    target: 'Maturity layer',
    note: 'Derived diagnostic queue that belongs to later operational maturity, not current shell pressure',
  },
];

const consumersRows = [
  {
    id: 'consumer_1042',
    display: 'Alex Morgan',
    verification: 'PENDING',
    priority: 'High',
    accountType: 'INDIVIDUAL',
    stripeIdentity: 'RETRY_REQUIRED',
    owner: 'Risk reviewer',
    linked: '2 payments · 2 docs',
    lastTouched: '12m',
    route: '/consumers/consumer_1042',
  },
  {
    id: 'consumer_2088',
    display: 'Northstar LLC',
    verification: 'MORE_INFO',
    priority: 'High',
    accountType: 'BUSINESS',
    stripeIdentity: 'PENDING_REVIEW',
    owner: 'Finance ops',
    linked: '1 payout · 3 ledger entries',
    lastTouched: '31m',
    route: '/consumers/consumer_2088',
  },
  {
    id: 'consumer_9011',
    display: 'Jamie Carter',
    verification: 'VERIFIED',
    priority: 'Medium',
    accountType: 'INDIVIDUAL',
    stripeIdentity: 'VERIFIED',
    owner: 'Collections',
    linked: '1 dispute · audit trail',
    lastTouched: '1h',
    route: '/consumers/consumer_9011',
  },
];

const verificationRows = [
  {
    id: 'verification_1042',
    consumer: 'consumer_1042',
    reason: 'Identity document mismatch',
    severity: 'High',
    decisionWindow: '2h',
    evidence: '2 docs · 1 retry',
    owner: 'risk.ops',
    route: '/verification/consumer_1042',
  },
  {
    id: 'verification_2088',
    consumer: 'consumer_2088',
    reason: 'Manual review requested',
    severity: 'Medium',
    decisionWindow: '6h',
    evidence: 'Profile + Stripe context',
    owner: 'manual.review',
    route: '/verification/consumer_2088',
  },
  {
    id: 'verification_3110',
    consumer: 'consumer_3110',
    reason: 'Beneficial owner evidence stale',
    severity: 'High',
    decisionWindow: '4h',
    evidence: '3 submitted docs',
    owner: 'compliance',
    route: '/verification/consumer_3110',
  },
];

const paymentRows = [
  {
    id: 'pr_1042',
    amount: '$2,400.00',
    persistedStatus: 'WAITING_RECIPIENT_APPROVAL',
    effectiveStatus: 'OVERDUE',
    staleWarning: 'derived status lag',
    rail: 'CARD',
    owner: 'collections',
    route: '/payments/pr_1042',
  },
  {
    id: 'pr_9811',
    amount: '$620.00',
    persistedStatus: 'PROCESSING',
    effectiveStatus: 'PROCESSING',
    staleWarning: 'none',
    rail: 'BANK',
    owner: 'payments.ops',
    route: '/payments/pr_9811',
  },
  {
    id: 'pr_4118',
    amount: '$9,900.00',
    persistedStatus: 'UNCOLLECTIBLE',
    effectiveStatus: 'UNCOLLECTIBLE',
    staleWarning: 'none',
    rail: 'BANK',
    owner: 'finance.ops',
    route: '/payments/pr_4118',
  },
];

const ledgerRows = [
  {
    id: 'ledger_881',
    amount: '+$2,400.00',
    effectiveStatus: 'SETTLED',
    entryType: 'PAYMENT_REQUEST',
    disputeState: 'None',
    linked: 'pr_1042',
    route: '/ledger/ledger_881',
  },
  {
    id: 'ledger_882',
    amount: '-$35.00',
    effectiveStatus: 'SETTLED',
    entryType: 'PLATFORM_FEE',
    disputeState: 'None',
    linked: 'pr_1042',
    route: '/ledger/ledger_882',
  },
  {
    id: 'ledger_883',
    amount: '-$9,900.00',
    effectiveStatus: 'PENDING',
    entryType: 'USER_PAYOUT',
    disputeState: 'Review',
    linked: 'pr_4118',
    route: '/ledger/ledger_883',
  },
];

const auditRows = [
  {
    action: 'verification_approve',
    actor: 'admin.ops@company.dev',
    target: 'consumer_1042',
    scope: 'verification',
    time: '09:14',
    metadata: 'reason present · correlation attached',
  },
  {
    action: 'consumer_force_logout',
    actor: 'admin.risk@company.dev',
    target: 'consumer_2088',
    scope: 'auth',
    time: '09:02',
    metadata: 'device scope all · actor attribution complete',
  },
  {
    action: 'verification_flag',
    actor: 'admin.compliance@company.dev',
    target: 'consumer_3110',
    scope: 'verification',
    time: '08:41',
    metadata: 'evidence gap noted · queue remains actionable',
  },
];

const documentRows = [
  {
    id: 'doc_211',
    title: 'Invoice March #1042.pdf',
    kind: 'Invoice',
    reviewState: 'Ready',
    linked: 'pr_1042 · consumer_1042',
    freshness: 'fresh',
  },
  {
    id: 'doc_144',
    title: 'Identity report.pdf',
    kind: 'Compliance',
    reviewState: 'Review',
    linked: 'verification_1042 · consumer_1042',
    freshness: 'retry needed',
  },
  {
    id: 'doc_008',
    title: 'Beneficial owner proof.pdf',
    kind: 'Compliance',
    reviewState: 'Missing linkage',
    linked: 'consumer_3110',
    freshness: 'stale evidence',
  },
];

const adminRows = [
  {
    name: 'Olivia Reed',
    role: 'Super Admin',
    status: 'Active',
    capabilityChange: 'role review pending',
    audit: '3 changes this week',
  },
  {
    name: 'Mason Clark',
    role: 'Finance Ops',
    status: 'Active',
    capabilityChange: 'none',
    audit: '1 approval today',
  },
  {
    name: 'Ella Turner',
    role: 'Risk Reviewer',
    status: 'Pending Invite',
    capabilityChange: 'invite awaiting confirmation',
    audit: 'invite trail complete',
  },
];

const systemRows = [
  {
    signal: 'Stripe webhook health',
    state: 'Watch',
    nextStep: 'Open payment delivery trace',
    ownership: 'payments',
  },
  {
    signal: 'Scheduler health',
    state: 'Healthy',
    nextStep: 'Open scheduled jobs audit',
    ownership: 'shared',
  },
  {
    signal: 'Email delivery issue pattern',
    state: 'Investigate',
    nextStep: 'Open auth + notifications audit',
    ownership: 'support',
  },
];

const workspaceMeta = {
  '/overview': {
    eyebrow: 'Derived pack-clean v2 shell',
    title: 'Overview',
    description:
      'This derived visual artifact separates target map, phase navigation, and target-state-clean reading. The core shell is already operational through Payments and Ledger, Exchange is phase-visible but lighter than the core shell, Documents remains top-level breadth, and Admins/System stay visibly later layers.',
  },
  '/consumers': {
    eyebrow: 'Core ops case hub',
    title: 'Consumers',
    description:
      'Consumer list remains triage-first and case-first, with explicit cross-links into verification, payments, documents, and audit.',
  },
  '/verification': {
    eyebrow: 'Decision-heavy review surface',
    title: 'Verification and Risk',
    description:
      'Review queues, SLA pressure, evidence context, and decision actions without drifting into a generic support inbox.',
  },
  '/payments': {
    eyebrow: 'Financial investigation workspace',
    title: 'Payments',
    description:
      'Payment request lifecycle investigation with explicit distinction between persisted status, effective status, and stale-warning semantics.',
  },
  '/ledger': {
    eyebrow: 'Read-heavy immutable surface',
    title: 'Ledger and Disputes',
    description:
      'Append-only financial investigation surface with dispute context, grouped history, and no broad edit posture.',
  },
  '/exchange': {
    eyebrow: 'Phase-visible breadth workspace',
    title: 'Exchange',
    description:
      'Exchange is visible in this reading as a phase-available breadth destination, but it stays lighter than the core shell and does not redefine canonical route-family tiers.',
  },
  '/audit': {
    eyebrow: 'Append-only reconstruction family',
    title: 'Audit',
    description:
      'This preview renders Audit as a shell bucket over the canonical explorer family: auth, admin-actions, and consumer-actions.',
  },
  '/documents': {
    eyebrow: 'Top-level breadth workspace',
    title: 'Documents',
    description:
      'Evidence-oriented workspace that belongs to the target top-level map, but remains visually secondary to the core shell.',
  },
  '/admins': {
    eyebrow: 'Later breadth workspace',
    title: 'Admins',
    description:
      'Read-heavy governance visibility that remains secondary until broader admin lifecycle breadth is phase-appropriate.',
  },
  '/system': {
    eyebrow: 'Maturity workspace',
    title: 'System',
    description:
      'Cross-domain diagnostics only, with explicit admission-rule framing so this surface does not dilute domain ownership.',
  },
};

const contextByPath = {
  '/consumers': {
    title: 'Consumer case as canonical hub',
    summary:
      'The list is triage-only. Related workflows stay as explicit routes: payment request case, verification case, documents, and audit are linked out rather than embedded.',
    stats: [
      ['Pending verification', '1'],
      ['Open payments', '2'],
      ['Attached docs', '2'],
      ['Audit links', '4'],
    ],
    links: [
      'Open canonical consumer case',
      'Open payment request case',
      'Open verification case',
      'Open auth audit filtered by consumer',
    ],
    notes: [
      'No inline balances or hidden financial truth in the list.',
      'Support actions remain narrow and auditable.',
    ],
  },
  '/verification': {
    title: 'Verification case cross-links',
    summary:
      'Decision workflows stay explicit. Evidence, prior retries, consumer profile, and audit trails are linked for investigation speed without merging their ownership.',
    stats: [
      ['Retry count', '2'],
      ['Evidence gaps', '1'],
      ['Decision SLA', '2h'],
      ['Escalation owner', 'risk.ops'],
    ],
    links: [
      'Open consumer profile',
      'Open evidence documents',
      'Open verification audit trail',
      'Open suspicious auth investigation',
    ],
    notes: [
      'Decision reason must be required and auditable.',
      'Verification should not drift into generic support tooling.',
    ],
  },
  '/payments': {
    title: 'Payment request case cross-links',
    summary:
      'List-level triage can show stale warnings and effective status, but final truth still belongs to payment detail and linked ledger history.',
    stats: [
      ['Ledger entries', '3'],
      ['Dispute state', 'None'],
      ['Escalation owner', 'collections'],
      ['Stale warnings', '1'],
    ],
    links: [
      'Open payment request detail',
      'Open linked ledger timeline',
      'Open payer consumer case',
      'Open document evidence',
    ],
    notes: [
      'Persisted status is convenience, not final truth.',
      'Escalation should be explicit and attributed.',
    ],
  },
  '/ledger': {
    title: 'Ledger entry and dispute investigation',
    summary:
      'Ledger remains append-only. Dispute history and grouped entries are visible, but corrective paths must append new events instead of mutating history.',
    stats: [
      ['Linked payment', 'pr_4118'],
      ['Timeline state', 'append-only'],
      ['Open disputes', '1'],
      ['Actor source', 'system'],
    ],
    links: [
      'Open related payment request case',
      'Open dispute log',
      'Open related consumer case',
      'Open actor-focused audit filter',
    ],
    notes: [
      'No inline ledger editing path.',
      'Dispute semantics must not collapse into a single badge.',
    ],
  },
  '/exchange': {
    title: 'Exchange breadth without shell overclaim',
    summary:
      'Rates, rules, and scheduled conversions are phase-visible here as a top-level destination, but they remain visually lighter than the core shell and should not read as active pressure by default.',
    stats: [
      ['Rates requiring review', '2'],
      ['Paused rules', '1'],
      ['Scheduled failures', '2'],
      ['Linked ledger cases', '3'],
    ],
    links: [
      'Open approved and stale rates review',
      'Open auto-conversion rules oversight',
      'Open scheduled conversions queue',
      'Open linked ledger investigation',
    ],
    notes: [
      'Exchange is phase-visible breadth, not a silent extension of the core pressure grid.',
      'Execution actions stay narrow, explicit, and audit-bound.',
    ],
  },
  '/audit': {
    title: 'Audit explorer routing',
    summary:
      'Audit is a first-class investigation surface. In this preview `/audit` acts as a shell bucket over canonical explorers instead of replacing the underlying route map.',
    stats: [
      ['Actor attribution', '100%'],
      ['Correlation IDs', 'Present'],
      ['Critical actions', '3'],
      ['Missing metadata', '0'],
    ],
    links: [
      'Open target consumer case',
      'Open target payment request case',
      'Open target ledger entry',
      'Open actor-focused filter',
    ],
    notes: [
      'Audit stays append-only and read-heavy.',
      'Actor-target reconstruction should feel fast, not forensic-by-default.',
    ],
  },
  '/documents': {
    title: 'Evidence review boundaries',
    summary:
      'Documents exist to support verification, payments, and consumer investigations. This is evidence review, not a generic file browser.',
    stats: [
      ['Missing linkage', '1'],
      ['Stale evidence', '1'],
      ['Review queue', '2'],
      ['Linked cases', '3'],
    ],
    links: [
      'Open owning consumer case',
      'Open verification case using evidence',
      'Open payment request case',
      'Open document audit trail',
    ],
    notes: [
      'Ownership remains with the originating workflow.',
      'Freshness and linkage gaps should stay explicit.',
    ],
  },
  '/admins': {
    title: 'Admins breadth, not core ops',
    summary:
      'Admin lifecycle and role changes live here as later breadth, with explicit governance semantics and read-heavy posture.',
    stats: [
      ['Pending invites', '1'],
      ['Critical roles', '2'],
      ['Capability reviews', '3 this week'],
      ['Self-lockout guard', 'On'],
    ],
    links: ['Open admin directory', 'Open role-change audit', 'Open invite review', 'Open governance policy'],
    notes: [
      'Config-based RBAC is enough for read visibility, not lifecycle breadth.',
      'Read-heavy visibility is safer than premature breadth depth.',
    ],
  },
  '/system': {
    title: 'System admission rule',
    summary:
      'System hosts only cross-domain operational diagnostics. If a signal belongs to a domain workspace, the correct action is to route the operator there.',
    stats: [
      ['Cross-domain signals', '3'],
      ['Infra duplication', 'forbidden'],
      ['Next actions', 'domain-routed'],
      ['Escalation playbooks', 'linked'],
    ],
    links: ['Open payment delivery trace', 'Open jobs audit', 'Open auth + email audit', 'Open escalation playbook'],
    notes: [
      'No infra dashboard duplication.',
      'No product investigation should migrate here if a domain already owns it.',
    ],
  },
};

export default function AdminV2HybridPackCleanV2ShellPreview() {
  const allWorkspaces = [...coreWorkspaces, ...phaseVisibleWorkspaces, ...topLevelBreadthWorkspaces, ...laterBreadthWorkspaces, ...maturityWorkspaces];
  const [currentPath, setCurrentPath] = useState('/overview');
  const activeWorkspace = useMemo(
    () => allWorkspaces.find((workspace) => workspace.path === currentPath) || allWorkspaces[0],
    [currentPath]
  );
  const meta = workspaceMeta[currentPath] || workspaceMeta['/overview'];
  const context = contextByPath[currentPath] || null;

  return (
    <div className="min-h-screen bg-[#09121f] text-[#edf3ff]">
      <div className="mx-auto min-h-screen w-full max-w-[1600px]">
        <div className="border-b border-white/10 bg-[#0d1627] px-4 py-3 md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-cyan-300/70">Admin v2 derived preview</div>
              <div className="mt-1 text-lg font-semibold">{activeWorkspace.label}</div>
              <div className="mt-1 text-xs text-white/45">{activeWorkspace.queue}</div>
            </div>
            <div className="flex gap-2 text-xs">
              <ActionGhost>Search</ActionGhost>
              <ActionGhost>Views</ActionGhost>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {coreWorkspaces.map((workspace) => {
              const active = workspace.path === currentPath;
              return (
                <button
                  key={workspace.path}
                  type="button"
                  onClick={() => setCurrentPath(workspace.path)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
                    active ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-200' : 'border-white/10 bg-white/[0.03] text-white/65'
                  }`}
                >
                  {workspace.shortLabel}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {mobileSecondaryWorkspaces.map((workspace) => {
              const active = workspace.path === currentPath;
              return (
                <button
                  key={workspace.path}
                  type="button"
                  onClick={() => setCurrentPath(workspace.path)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-[11px] ${
                    active ? 'border-white/20 bg-white/[0.08] text-white' : 'border-white/10 bg-white/[0.02] text-white/50'
                  }`}
                >
                  {workspace.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div className="md:flex">
          <aside className="hidden w-[320px] shrink-0 border-r border-white/10 bg-[#0d1627] md:block">
            <div className="px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 font-semibold text-cyan-200">
                  A2
                </div>
                <div>
                  <div className="text-lg font-semibold">Admin v2</div>
                  <div className="text-xs text-white/40">Derived pack-clean v2 prototype</div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/75">Artifact contract</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <TinyPill tone="cyan">queue-first</TinyPill>
                  <TinyPill>audit-first</TinyPill>
                  <TinyPill>case-first</TinyPill>
                  <TinyPill>derived artifact</TinyPill>
                </div>
                <p className="mt-3 leading-6 text-white/55">
                  This preview is an illustrative interpretation artifact. Canonical planning, phase-specific navigation, and route-family truth remain in the markdown pack.
                </p>
                <div className="mt-4 space-y-3">
                  {artifactLayers.map((layer) => (
                    <LayerLegendRow key={layer.label} label={layer.label} value={layer.value} />
                  ))}
                </div>
              </div>
            </div>

            <nav className="px-3">
              <div className="px-2 text-[11px] uppercase tracking-[0.24em] text-white/32">Core shell</div>
              <ul className="mt-2 space-y-1">
                {coreWorkspaces.map((workspace) => {
                  const active = workspace.path === currentPath;
                  return (
                    <li key={workspace.path}>
                      <button
                        type="button"
                        onClick={() => setCurrentPath(workspace.path)}
                        className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                          active
                            ? 'border border-cyan-400/20 bg-cyan-500/10 text-white'
                            : 'border border-transparent text-white/72 hover:border-white/10 hover:bg-white/[0.03] hover:text-white'
                        }`}
                      >
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center text-sm">{workspace.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{workspace.label}</span>
                          <span className="mt-1 block text-xs text-white/38">{workspace.queue}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 px-2 text-[11px] uppercase tracking-[0.24em] text-white/32">Phase-visible breadth</div>
              <ul className="mt-2 space-y-1">
                {phaseVisibleWorkspaces.map((workspace) => {
                  const active = workspace.path === currentPath;
                  return (
                    <li key={workspace.path}>
                      <button
                        type="button"
                        onClick={() => setCurrentPath(workspace.path)}
                        className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                          active
                            ? 'border border-white/15 bg-white/[0.05] text-white'
                            : 'border border-transparent text-white/68 hover:border-white/10 hover:bg-white/[0.03] hover:text-white/88'
                        }`}
                      >
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center text-sm">{workspace.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{workspace.label}</span>
                          <span className="mt-1 block text-xs text-white/35">{workspace.note}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 px-2 text-[11px] uppercase tracking-[0.24em] text-white/32">Top-level breadth</div>
              <ul className="mt-2 space-y-1">
                {topLevelBreadthWorkspaces.map((workspace) => {
                  const active = workspace.path === currentPath;
                  return (
                    <li key={workspace.path}>
                      <button
                        type="button"
                        onClick={() => setCurrentPath(workspace.path)}
                        className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                          active
                            ? 'border border-white/15 bg-white/[0.05] text-white'
                            : 'border border-transparent text-white/64 hover:border-white/10 hover:bg-white/[0.03] hover:text-white/85'
                        }`}
                      >
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center text-sm">{workspace.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{workspace.label}</span>
                          <span className="mt-1 block text-xs text-white/35">{workspace.note}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 px-2 text-[11px] uppercase tracking-[0.24em] text-white/32">Later breadth</div>
              <ul className="mt-2 space-y-1">
                {laterBreadthWorkspaces.map((workspace) => {
                  const active = workspace.path === currentPath;
                  return (
                    <li key={workspace.path}>
                      <button
                        type="button"
                        onClick={() => setCurrentPath(workspace.path)}
                        className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                          active
                            ? 'border border-white/15 bg-white/[0.04] text-white'
                            : 'border border-transparent text-white/55 hover:border-white/10 hover:bg-white/[0.03] hover:text-white/80'
                        }`}
                      >
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center text-sm">{workspace.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{workspace.label}</span>
                          <span className="mt-1 block text-xs text-white/35">{workspace.note}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 px-2 text-[11px] uppercase tracking-[0.24em] text-white/32">Maturity layer</div>
              <ul className="mt-2 space-y-1">
                {maturityWorkspaces.map((workspace) => {
                  const active = workspace.path === currentPath;
                  return (
                    <li key={workspace.path}>
                      <button
                        type="button"
                        onClick={() => setCurrentPath(workspace.path)}
                        className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                          active
                            ? 'border border-white/15 bg-white/[0.04] text-white'
                            : 'border border-transparent text-white/50 hover:border-white/10 hover:bg-white/[0.03] hover:text-white/75'
                        }`}
                      >
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center text-sm">{workspace.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{workspace.label}</span>
                          <span className="mt-1 block text-xs text-white/35">{workspace.note}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="border-t border-white/10 px-5 py-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/32">Frequent investigation starts</div>
              <div className="mt-3 space-y-2">
                {frequentInvestigationStarts.map((view) => (
                  <button key={view.label} type="button" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left">
                    <div className="text-sm font-medium text-white/85">{view.label}</div>
                    <div className="mt-1 text-xs text-white/40">{view.query}</div>
                    <div className="mt-2 text-[11px] text-white/30">{view.summary}</div>
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                <div className="font-medium text-white/85">olivia.reed@company.dev</div>
                <div className="mt-1 text-white/45">Super Admin · actor attribution required</div>
                <div className="mt-3 flex gap-2">
                  <ActionGhost>Switch view</ActionGhost>
                  <ActionGhost>Logout</ActionGhost>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="hidden border-b border-white/10 bg-[#0b1424]/95 px-6 py-4 backdrop-blur md:block">
              <div className="flex items-center justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <span>Admin v2</span>
                    <span>/</span>
                    <span>{meta.title}</span>
                    <span>/</span>
                    <span className="text-cyan-300/80">derived pack-clean preview</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex min-w-[360px] flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/45">
                      <span>⌕</span>
                      <span>Search consumer, payment, ledger, document, actor, correlation id...</span>
                    </div>
                    <ActionGhost>Investigate</ActionGhost>
                    <ActionGhost>Escalations</ActionGhost>
                    <ActionPrimary>Open case</ActionPrimary>
                  </div>
                </div>
              </div>
            </header>

            <main className="px-4 pb-24 pt-5 md:px-6 md:py-6">
              <section className="mb-6 md:hidden">
                <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#0c1729_0%,#09121f_100%)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/75">{meta.eyebrow}</div>
                      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{meta.title}</h1>
                      <p className="mt-2 text-sm leading-6 text-white/55">{meta.description}</p>
                    </div>
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-cyan-400/20 bg-cyan-500/10 text-2xl text-cyan-200">
                      {activeWorkspace.icon}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <TinyPill tone="cyan">{activeWorkspace.queue}</TinyPill>
                    <TinyPill tone="amber">derived artifact</TinyPill>
                    <TinyPill>phase nav stays canonical</TinyPill>
                    <TinyPill>mobile quick-nav is condensed</TinyPill>
                  </div>
                </div>
              </section>

              <section className="mb-6 hidden md:block">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/75">{meta.eyebrow}</div>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-[2rem]">{meta.title}</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-white/55 md:text-[15px]">{meta.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <TinyPill tone="cyan">{activeWorkspace.queue}</TinyPill>
                    <TinyPill tone="amber">derived visual interpretation</TinyPill>
                    <TinyPill>phase nav stays canonical</TinyPill>
                    <TinyPill>actor attribution enforced</TinyPill>
                  </div>
                </div>
              </section>

              {currentPath === '/overview' ? <OverviewWorkspace onJump={setCurrentPath} /> : null}
              {currentPath === '/consumers' ? (
                <WorkspaceLayout main={<ConsumersWorkspace />} rail={<ContextRail context={context} />} />
              ) : null}
              {currentPath === '/verification' ? (
                <WorkspaceLayout main={<VerificationWorkspace />} rail={<ContextRail context={context} />} />
              ) : null}
              {currentPath === '/payments' ? (
                <WorkspaceLayout main={<PaymentsWorkspace />} rail={<ContextRail context={context} />} />
              ) : null}
              {currentPath === '/ledger' ? (
                <WorkspaceLayout main={<LedgerWorkspace />} rail={<ContextRail context={context} />} />
              ) : null}
              {currentPath === '/exchange' ? (
                <WorkspaceLayout main={<ExchangeWorkspace />} rail={<ContextRail context={context} />} />
              ) : null}
              {currentPath === '/audit' ? (
                <WorkspaceLayout main={<AuditWorkspace />} rail={<ContextRail context={context} />} />
              ) : null}
              {currentPath === '/documents' ? (
                <WorkspaceLayout main={<DocumentsWorkspace />} rail={<ContextRail context={context} />} />
              ) : null}
              {currentPath === '/admins' ? (
                <WorkspaceLayout main={<AdminsWorkspace />} rail={<ContextRail context={context} />} />
              ) : null}
              {currentPath === '/system' ? (
                <WorkspaceLayout main={<SystemWorkspace />} rail={<ContextRail context={context} />} />
              ) : null}
            </main>
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#081220]/95 px-2 py-2 backdrop-blur md:hidden">
        <div className="mx-auto mb-2 max-w-md text-center text-[10px] leading-4 text-white/38">
          Condensed quick-nav only. Exchange, Documents, Admins and System stay reachable from header chips, and omission here is not a tier change.
        </div>
        <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
          {mobileNavItems.map((item) => {
            const active = item.path === currentPath;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => setCurrentPath(item.path)}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] ${
                  active ? 'bg-cyan-500/15 text-cyan-300' : 'text-white/60'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function OverviewWorkspace({ onJump }) {
  return (
    <div className="space-y-5">
      <Panel title="Operational pressure" aside="6 signals present, 5 available now, 1 temporarily unavailable">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeSignals.map((signal) => (
            <SignalCard key={signal.key} signal={signal} onJump={onJump} />
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Panel title="Breadth signals outside the pressure grid" aside="phase-visible or deferred work belongs here, not in active shell pressure">
          <div className="space-y-3">
            {plannedSignals.map((signal) => (
              <PlannedSignalCard key={signal.key} signal={signal} />
            ))}
          </div>
        </Panel>

        <Panel title="Artifact contract" aside="how to read this preview safely">
          <ChecklistItem checked>This file is a derived visual interpretation artifact, not a source of planning truth.</ChecklistItem>
          <ChecklistItem checked>Core shell is read as operational through Payments and Ledger, while Exchange is phase-visible breadth rather than core pressure.</ChecklistItem>
          <ChecklistItem checked>Phase-specific navigation and exact route families stay canonical in the markdown pack.</ChecklistItem>
          <ChecklistItem>`/audit` is shown here as a family wrapper, and shortcut language remains illustrative rather than a saved-view product contract.</ChecklistItem>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Frequent investigation starts" aside="operator rhythm without maturity overclaim">
          <div className="space-y-3">
            {frequentInvestigationStarts.map((view) => (
              <button key={view.label} type="button" className="flex w-full items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
                <div>
                  <div className="font-medium text-white/88">{view.label}</div>
                  <div className="mt-1 text-sm text-white/42">{view.query}</div>
                  <div className="mt-2 text-[11px] text-white/32">{view.summary}</div>
                </div>
                <span className="text-cyan-300">→</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Responsive dense-surface strategy" aside="production-shaped degradation model">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ModeCard
              label="Mobile"
              title="Queue cards"
              note="Single-column stack with primary subject, status, urgency, and one-tap drill-in. No fake mini-table."
            />
            <ModeCard
              label="Tablet"
              title="Condensed rows"
              note="Split rows keep scan speed while avoiding overflow-heavy desktop layouts on medium widths."
            />
            <ModeCard
              label="Desktop"
              title="Dense table"
              note="Full comparative table comes back only where width supports multi-column reasoning."
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ConsumersWorkspace() {
  return (
    <div className="space-y-5">
      <Panel title="Consumer list" aside="case hub entry, no inline balances">
        <Toolbar
          chips={['Search: email / name / id', 'Verification status', 'Account type', 'Stripe Identity']}
          filters={['Sort: last touched', 'Page size: 25', 'Case hub entry only']}
        />
        <ResponsiveDataSurface
          columns={['Consumer', 'Verification', 'Priority', 'Account type', 'Owner', 'Last touched']}
          rows={consumersRows}
          renderDesktopRow={(row) => [
            <CellPrimary key={`${row.id}-consumer`} title={row.display} subtitle={`${row.id} · ${row.linked}`} />,
            <StatusPill key={`${row.id}-verification`} status={row.verification} />,
            <PriorityPill key={`${row.id}-priority`} priority={row.priority} />,
            row.accountType,
            row.owner,
            row.lastTouched,
          ]}
          renderTabletRow={(row) => (
            <TabletRow
              title={row.display}
              subtitle={`${row.id} · ${row.linked}`}
              status={<StatusPill status={row.verification} />}
              right={<PriorityPill priority={row.priority} />}
              facts={[row.accountType, row.owner, row.lastTouched]}
            />
          )}
          renderMobileCard={(row) => (
            <MobileQueueCard
              title={row.display}
              subtitle={`${row.id} · ${row.linked}`}
              status={<StatusPill status={row.verification} />}
              urgency={<PriorityPill priority={row.priority} />}
              meta={[row.accountType, row.owner, row.lastTouched]}
            />
          )}
        />
      </Panel>
    </div>
  );
}

function VerificationWorkspace() {
  return (
    <div className="space-y-5">
      <Panel title="Verification and Risk queue" aside="review and decision workflow">
        <Toolbar
          chips={['Pending', 'More info', 'Flagged', 'Retry required']}
          filters={['Sort: decision window', 'Page size: 20', 'Escalation markers visible']}
        />
        <ResponsiveDataSurface
          columns={['Case', 'Reason', 'Severity', 'Decision window', 'Evidence', 'Owner']}
          rows={verificationRows}
          renderDesktopRow={(row) => [
            <CellPrimary key={`${row.id}-case`} title={row.consumer} subtitle={`${row.id} · ${row.route}`} />,
            row.reason,
            <StatusPill key={`${row.id}-severity`} status={row.severity} />,
            row.decisionWindow,
            row.evidence,
            row.owner,
          ]}
          renderTabletRow={(row) => (
            <TabletRow
              title={row.consumer}
              subtitle={`${row.reason} · ${row.id}`}
              status={<StatusPill status={row.severity} />}
              right={<span className="text-xs text-cyan-300">{row.decisionWindow}</span>}
              facts={[row.evidence, row.owner, row.route]}
            />
          )}
          renderMobileCard={(row) => (
            <MobileQueueCard
              title={row.consumer}
              subtitle={row.reason}
              status={<StatusPill status={row.severity} />}
              urgency={<span className="rounded-full border border-cyan-400/25 px-2 py-1 text-[11px] text-cyan-200">{row.decisionWindow}</span>}
              meta={[row.evidence, row.owner, row.route]}
            />
          )}
        />
      </Panel>

      <Panel title="Decision controls" aside="regulated action posture">
        <ChecklistItem checked>Approve, reject, request-info, and flag remain explicit decision actions.</ChecklistItem>
        <ChecklistItem checked>Confirmation, reason, idempotency, and version checks belong to this flow.</ChecklistItem>
        <ChecklistItem>Verification should never collapse into a generic support mutation zone.</ChecklistItem>
      </Panel>
    </div>
  );
}

function PaymentsWorkspace() {
  return (
    <div className="space-y-5">
      <Panel title="Payment requests list" aside="investigation-heavy, not mutation-heavy">
        <Toolbar
          chips={['Status', 'Payment rail', 'Currency', 'Amount range', 'Due date']}
          filters={['Sort: overdue first', 'Page size: 25', 'Triage snapshot allowed']}
        />
        <ResponsiveDataSurface
          columns={['Request', 'Amount', 'Persisted', 'Effective', 'Rail', 'Warning']}
          rows={paymentRows}
          renderDesktopRow={(row) => [
            <CellPrimary key={`${row.id}-request`} title={row.id} subtitle={row.route} />,
            row.amount,
            row.persistedStatus,
            <StatusPill key={`${row.id}-effective`} status={row.effectiveStatus} />,
            row.rail,
            row.staleWarning,
          ]}
          renderTabletRow={(row) => (
            <TabletRow
              title={`${row.id} · ${row.amount}`}
              subtitle={`${row.persistedStatus} -> ${row.effectiveStatus}`}
              status={<StatusPill status={row.effectiveStatus} />}
              right={<span className="text-xs text-white/45">{row.rail}</span>}
              facts={[`warning: ${row.staleWarning}`, row.owner, row.route]}
            />
          )}
          renderMobileCard={(row) => (
            <MobileQueueCard
              title={`${row.id} · ${row.amount}`}
              subtitle={row.persistedStatus}
              status={<StatusPill status={row.effectiveStatus} />}
              urgency={<span className="rounded-full border border-amber-400/25 px-2 py-1 text-[11px] text-amber-200">{row.staleWarning}</span>}
              meta={[row.rail, row.owner, row.route]}
            />
          )}
        />
      </Panel>

      <Panel title="Finance posture" aside="source-of-truth boundaries">
        <ChecklistItem checked>Persisted status is acceptable for list triage but not final investigation truth.</ChecklistItem>
        <ChecklistItem checked>Stale warnings remain explicit rather than hidden in a badge.</ChecklistItem>
        <ChecklistItem>Escalation and correction paths must stay auditable and attributed.</ChecklistItem>
      </Panel>
    </div>
  );
}

function LedgerWorkspace() {
  return (
    <div className="space-y-5">
      <Panel title="Ledger explorer" aside="effective status and immutable history">
        <Toolbar
          chips={['Entry type', 'Effective status', 'Dispute state', 'Linked payment']}
          filters={['Sort: newest first', 'Page size: 50', 'Append-only posture visible']}
        />
        <ResponsiveDataSurface
          columns={['Entry', 'Amount', 'Status', 'Type', 'Dispute', 'Linked']}
          rows={ledgerRows}
          renderDesktopRow={(row) => [
            <CellPrimary key={`${row.id}-entry`} title={row.id} subtitle={row.route} />,
            row.amount,
            <StatusPill key={`${row.id}-status`} status={row.effectiveStatus} />,
            row.entryType,
            row.disputeState,
            row.linked,
          ]}
          renderTabletRow={(row) => (
            <TabletRow
              title={`${row.id} · ${row.amount}`}
              subtitle={`${row.entryType} · linked ${row.linked}`}
              status={<StatusPill status={row.effectiveStatus} />}
              right={<span className="text-xs text-white/45">{row.disputeState}</span>}
              facts={[row.route, 'immutable history', 'append-only']}
            />
          )}
          renderMobileCard={(row) => (
            <MobileQueueCard
              title={`${row.id} · ${row.amount}`}
              subtitle={row.entryType}
              status={<StatusPill status={row.effectiveStatus} />}
              urgency={<span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/55">{row.disputeState}</span>}
              meta={[row.linked, row.route, 'append-only']}
            />
          )}
        />
      </Panel>

      <Panel title="Ledger guardrails" aside="financial safety">
        <ChecklistItem checked>Ledger remains immutable and append-only.</ChecklistItem>
        <ChecklistItem checked>Any corrective action should create a new auditable event.</ChecklistItem>
        <ChecklistItem>No broad ledger editing path should exist in this operator shell.</ChecklistItem>
      </Panel>
    </div>
  );
}

function ExchangeWorkspace() {
  return (
    <div className="space-y-5">
      <Panel title="Exchange breadth" aside="phase-visible destination, visually lighter than core shell">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ModeCard
            label="Rates"
            title="Approval and staleness review"
            note="Approved and stale rates are visible here as breadth review, not as core-shell pressure cards."
          />
          <ModeCard
            label="Rules"
            title="Auto-conversion oversight"
            note="Pause, resume, and run-now stay explicit and audit-bound rather than hidden inside generic controls."
          />
          <ModeCard
            label="Scheduled"
            title="Conversion queue"
            note="Scheduled failures and linked ledger outcomes stay visible without turning Exchange into the primary shell pressure surface."
          />
        </div>
      </Panel>

      <Panel title="Breadth guardrails" aside="what this layer should not imply">
        <ChecklistItem checked>Exchange is phase-visible and top-level in this reading, but still visually lighter than the core shell.</ChecklistItem>
        <ChecklistItem checked>Exchange visibility does not promote Payouts or Payment Methods beyond their canonical nested and secondary tiers.</ChecklistItem>
        <ChecklistItem>Exchange diagnostics should not be mistaken for core-shell pressure unless the canonical phase model changes first.</ChecklistItem>
      </Panel>
    </div>
  );
}

function AuditWorkspace() {
  return (
    <div className="space-y-5">
      <Panel title="Audit explorer family" aside="shell bucket over canonical auth, admin-actions, and consumer-actions routes">
        <Toolbar
          chips={['/audit/auth', '/audit/admin-actions', '/audit/consumer-actions']}
          filters={['Family wrapper only', 'Canonical route truth lives in the pack', 'Deep-link back to entity surfaces']}
        />
      </Panel>

      <Panel title="Audit explorer" aside="fast actor-target reconstruction">
        <Toolbar
          chips={['Admin actions', 'Auth events', 'Critical actions', 'Actor scope']}
          filters={['Sort: newest first', 'Actor attribution required', 'Correlation IDs visible']}
        />
        <ResponsiveDataSurface
          columns={['Action', 'Actor', 'Target', 'Scope', 'Time', 'Metadata']}
          rows={auditRows}
          renderDesktopRow={(row) => [
            row.action,
            row.actor,
            row.target,
            row.scope,
            row.time,
            row.metadata,
          ]}
          renderTabletRow={(row) => (
            <TabletRow
              title={row.action}
              subtitle={`${row.actor} -> ${row.target}`}
              status={<span className="rounded-full border border-cyan-400/25 px-2 py-1 text-[11px] text-cyan-200">{row.scope}</span>}
              right={<span className="text-xs text-white/45">{row.time}</span>}
              facts={[row.metadata]}
            />
          )}
          renderMobileCard={(row) => (
            <MobileQueueCard
              title={row.action}
              subtitle={`${row.actor} -> ${row.target}`}
              status={<span className="rounded-full border border-cyan-400/25 px-2 py-1 text-[11px] text-cyan-200">{row.scope}</span>}
              urgency={<span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/55">{row.time}</span>}
              meta={[row.metadata]}
            />
          )}
        />
      </Panel>
    </div>
  );
}

function DocumentsWorkspace() {
  return (
    <div className="space-y-5">
      <Panel title="Documents list" aside="top-level breadth, evidence review only">
        <Toolbar
          chips={['Kind', 'Review state', 'Freshness', 'Linked workflow']}
          filters={['Sort: review priority', 'Page size: 25', 'Evidence gaps visible']}
        />
        <ResponsiveDataSurface
          columns={['Document', 'Kind', 'Review state', 'Linked', 'Freshness']}
          rows={documentRows}
          renderDesktopRow={(row) => [
            <CellPrimary key={`${row.id}-doc`} title={row.title} subtitle={row.id} />,
            row.kind,
            row.reviewState,
            row.linked,
            row.freshness,
          ]}
          renderTabletRow={(row) => (
            <TabletRow
              title={row.title}
              subtitle={`${row.kind} · ${row.id}`}
              status={<span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/70">{row.reviewState}</span>}
              right={<span className="text-xs text-white/45">{row.freshness}</span>}
              facts={[row.linked]}
            />
          )}
          renderMobileCard={(row) => (
            <MobileQueueCard
              title={row.title}
              subtitle={row.kind}
              status={<span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/70">{row.reviewState}</span>}
              urgency={<span className="rounded-full border border-amber-400/25 px-2 py-1 text-[11px] text-amber-200">{row.freshness}</span>}
              meta={[row.linked]}
            />
          )}
        />
      </Panel>
    </div>
  );
}

function AdminsWorkspace() {
  return (
    <div className="space-y-5">
      <Panel title="Admin governance" aside="read-heavy visibility before broader lifecycle breadth">
        <ResponsiveDataSurface
          columns={['Admin', 'Role', 'Status', 'Capability change', 'Audit']}
          rows={adminRows}
          renderDesktopRow={(row) => [row.name, row.role, row.status, row.capabilityChange, row.audit]}
          renderTabletRow={(row) => (
            <TabletRow title={row.name} subtitle={row.role} status={row.status} right={null} facts={[row.capabilityChange, row.audit]} />
          )}
          renderMobileCard={(row) => (
            <MobileQueueCard title={row.name} subtitle={row.role} status={row.status} urgency={null} meta={[row.capabilityChange, row.audit]} />
          )}
        />
      </Panel>
    </div>
  );
}

function SystemWorkspace() {
  return (
    <div className="space-y-5">
      <Panel title="Cross-domain diagnostics" aside="maturity layer, domain-routed actions only">
        <ResponsiveDataSurface
          columns={['Signal', 'State', 'Next step', 'Owner']}
          rows={systemRows}
          renderDesktopRow={(row) => [row.signal, row.state, row.nextStep, row.ownership]}
          renderTabletRow={(row) => (
            <TabletRow title={row.signal} subtitle={row.nextStep} status={row.state} right={null} facts={[row.ownership]} />
          )}
          renderMobileCard={(row) => (
            <MobileQueueCard title={row.signal} subtitle={row.nextStep} status={row.state} urgency={null} meta={[row.ownership]} />
          )}
        />
      </Panel>
    </div>
  );
}

function WorkspaceLayout({ main, rail }) {
  return <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_0.95fr]">{main}{rail}</section>;
}

function ContextRail({ context }) {
  if (!context) {
    return null;
  }

  return (
    <div className="space-y-5">
      <Panel title={context.title} aside="linked context">
        <p className="text-sm leading-6 text-white/62">{context.summary}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {context.stats.map(([label, value]) => (
            <ContextStat key={label} label={label} value={value} />
          ))}
        </div>
      </Panel>

      <Panel title="Jump paths" aside="deep-link, do not inline-own">
        <div className="space-y-2">
          {context.links.map((link) => (
            <button key={link} type="button" className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-cyan-200">
              <span>{link}</span>
              <span>→</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Guardrails" aside="what this surface must not become">
        {context.notes.map((note) => (
          <ChecklistItem key={note}>{note}</ChecklistItem>
        ))}
      </Panel>
    </div>
  );
}

function ResponsiveDataSurface({ columns, rows, renderDesktopRow, renderTabletRow, renderMobileCard }) {
  return (
    <div>
      <div className="space-y-3 md:hidden">
        {rows.map((row, index) => (
          <React.Fragment key={`mobile-${index}`}>{renderMobileCard(row)}</React.Fragment>
        ))}
      </div>

      <div className="hidden space-y-3 md:block xl:hidden">
        {rows.map((row, index) => (
          <React.Fragment key={`tablet-${index}`}>{renderTabletRow(row)}</React.Fragment>
        ))}
      </div>

      <div className="hidden xl:block">
        <DenseTable columns={columns} rows={rows.map((row) => renderDesktopRow(row))} />
      </div>
    </div>
  );
}

function DenseTable({ columns, rows }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div
        className="grid bg-white/[0.04] px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/35"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((column) => (
          <div key={column}>{column}</div>
        ))}
      </div>
      <div className="divide-y divide-white/10 bg-white/[0.02]">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid items-start gap-3 px-4 py-3 text-sm text-white/76"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            {row.map((cell, cellIndex) => (
              <div key={cellIndex} className="min-w-0">
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Toolbar({ chips, filters }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <div key={chip} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/68">
            {chip}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <div key={filter} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/40">
            {filter}
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, aside, children }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white/90">{title}</h3>
        {aside ? <span className="text-right text-xs text-white/34">{aside}</span> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SignalCard({ signal, onJump }) {
  const tone = signal.availability === 'temporarily-unavailable'
    ? 'border-amber-400/20 bg-amber-500/10 text-amber-200'
    : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200';

  const isInteractive = Boolean(signal.href) && signal.availability === 'available' && signal.phaseStatus === 'live-actionable';

  return (
    <button
      type="button"
      onClick={() => {
        if (isInteractive) {
          onJump(signal.href.split('?')[0]);
        }
      }}
      className={`rounded-[26px] border p-5 text-left transition ${isInteractive ? 'hover:border-cyan-400/25 hover:bg-cyan-500/[0.08]' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${tone}`}>{signal.phaseStatus}</div>
        <div className="text-xs text-white/40">{signal.availability}</div>
      </div>
      <div className="mt-5 text-sm text-white/58">{signal.label}</div>
      <div className="mt-2 text-4xl font-semibold tracking-tight text-white">{signal.value}</div>
      <div className="mt-3 text-sm leading-6 text-white/50">{signal.urgency}</div>
    </button>
  );
}

function PlannedSignalCard({ signal }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-white/88">{signal.label}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/30">{signal.target}</div>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/45">deferred</span>
      </div>
      <div className="mt-3 text-sm leading-6 text-white/48">{signal.note}</div>
    </div>
  );
}

function MobileQueueCard({ title, subtitle, status, urgency, meta }) {
  return (
    <button type="button" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-white/90">{title}</div>
          <div className="mt-1 text-sm text-white/45">{subtitle}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {typeof status === 'string' ? <span className="text-sm text-white/70">{status}</span> : status}
          {urgency}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {meta.map((item) => (
          <span key={item} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/50">
            {item}
          </span>
        ))}
      </div>
    </button>
  );
}

function TabletRow({ title, subtitle, status, right, facts }) {
  return (
    <button type="button" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-white/88">{title}</div>
          <div className="mt-1 text-sm text-white/42">{subtitle}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {typeof status === 'string' ? <span className="text-sm text-white/70">{status}</span> : status}
          {right}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {facts.map((fact) => (
          <span key={fact} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
            {fact}
          </span>
        ))}
      </div>
    </button>
  );
}

function CellPrimary({ title, subtitle }) {
  return (
    <div>
      <div className="truncate font-medium text-white/88">{title}</div>
      <div className="mt-1 truncate text-xs text-white/38">{subtitle}</div>
    </div>
  );
}

function ContextStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs text-white/40">{label}</div>
      <div className="mt-1 font-medium text-white/90">{value}</div>
    </div>
  );
}

function LayerLegendRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">{label}</div>
      <div className="mt-2 text-sm leading-6 text-white/58">{value}</div>
    </div>
  );
}

function ModeCard({ label, title, note }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/75">{label}</div>
      <div className="mt-2 font-medium text-white/90">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/52">{note}</div>
    </div>
  );
}

function ActionGhost({ children }) {
  return (
    <button type="button" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/[0.04]">
      {children}
    </button>
  );
}

function ActionPrimary({ children }) {
  return (
    <button type="button" className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400">
      {children}
    </button>
  );
}

function ChecklistItem({ checked, children }) {
  return (
    <div className="flex items-start gap-3 text-sm text-white/72">
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border text-[10px] ${
          checked ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200' : 'border-white/15 text-transparent'
        }`}
      >
        ✓
      </span>
      <span>{children}</span>
    </div>
  );
}

function TinyPill({ children, tone = 'default' }) {
  const styles =
    tone === 'cyan'
      ? 'border-cyan-400/25 bg-cyan-500/10 text-cyan-200'
      : tone === 'amber'
        ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
        : 'border-white/10 bg-white/[0.03] text-white/70';

  return <span className={`rounded-full border px-3 py-1 text-xs ${styles}`}>{children}</span>;
}

function StatusPill({ status }) {
  const value = String(status);
  const styles =
    value === 'High' || value === 'PENDING' || value === 'OVERDUE'
      ? 'border-rose-400/25 bg-rose-500/10 text-rose-200'
      : value === 'Medium' || value === 'MORE_INFO' || value === 'Review'
        ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
        : value === 'VERIFIED' || value === 'SETTLED' || value === 'PROCESSING'
          ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
          : value === 'Unavailable'
            ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
            : 'border-white/10 bg-white/[0.03] text-white/70';

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${styles}`}>{value}</span>;
}

function PriorityPill({ priority }) {
  const styles =
    priority === 'High'
      ? 'border-rose-400/25 bg-rose-500/10 text-rose-200'
      : priority === 'Medium'
        ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
        : 'border-white/10 bg-white/[0.03] text-white/70';

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${styles}`}>{priority}</span>;
}
