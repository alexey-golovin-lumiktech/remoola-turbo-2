export type WorkspaceMeta = {
  title: string;
  eyebrow: string;
  queueLabel: string;
  queueIntent: string;
  mobileChromeMode?: `default` | `compact`;
  hideSupportingChipsOnTablet?: boolean;
};

const DEFAULT_WORKSPACE_META: WorkspaceMeta = {
  title: `Console`,
  eyebrow: `PLATFORM`,
  queueLabel: `Workspace context`,
  queueIntent: `Operational context for the current admin surface.`,
};

const WORKSPACE_META_BY_PREFIX: ReadonlyArray<{ prefix: string; meta: WorkspaceMeta }> = [
  {
    prefix: `/overview`,
    meta: {
      title: `Overview`,
      eyebrow: `Operations`,
      queueLabel: `Live signals`,
      queueIntent: `Operational queues, counts, and recommended investigation starts across admin workspaces.`,
    },
  },
  {
    prefix: `/consumers`,
    meta: {
      title: `Consumers`,
      eyebrow: `Case review`,
      queueLabel: `Consumer cases`,
      queueIntent: `Consumer identity, support, and risk context for linked cases and recent activity.`,
    },
  },
  {
    prefix: `/verification`,
    meta: {
      title: `Verification`,
      eyebrow: `Operations`,
      queueLabel: `Verification reviews`,
      queueIntent: `Cases waiting on KYC review, document follow-up, and approval decisions.`,
      mobileChromeMode: `compact`,
    },
  },
  {
    prefix: `/payments/operations`,
    meta: {
      title: `Payments · Operations`,
      eyebrow: `Operations`,
      queueLabel: `Payment follow-ups`,
      queueIntent: `Manual follow-up buckets for payment cases that need review before drilldown.`,
      mobileChromeMode: `compact`,
    },
  },
  {
    prefix: `/payments`,
    meta: {
      title: `Payments`,
      eyebrow: `Case review`,
      queueLabel: `Payment requests`,
      queueIntent: `Payment request queue with filters, ownership signals, and linked case drilldown.`,
    },
  },
  {
    prefix: `/ledger/anomalies`,
    meta: {
      title: `Ledger · Anomalies`,
      eyebrow: `Reference`,
      queueLabel: `Anomaly review`,
      queueIntent: `Reference-first ledger anomalies and disputes requiring investigation.`,
    },
  },
  {
    prefix: `/ledger`,
    meta: {
      title: `Ledger and Disputes`,
      eyebrow: `Case review`,
      queueLabel: `Ledger cases`,
      queueIntent: `Ledger entries, disputes, and related anomalies for investigation.`,
    },
  },
  {
    prefix: `/audit/auth`,
    meta: {
      title: `Audit · Auth`,
      eyebrow: `Audit`,
      queueLabel: `Auth event stream`,
      queueIntent: `Recent sign-in, sign-out, and recovery events for admins and consumers.`,
      mobileChromeMode: `compact`,
      hideSupportingChipsOnTablet: true,
    },
  },
  {
    prefix: `/audit/admin-actions`,
    meta: {
      title: `Audit · Admin Actions`,
      eyebrow: `Audit`,
      queueLabel: `Admin event stream`,
      queueIntent: `Recent admin-triggered actions and case mutations across the admin surface.`,
      mobileChromeMode: `compact`,
      hideSupportingChipsOnTablet: true,
    },
  },
  {
    prefix: `/audit/consumer-actions`,
    meta: {
      title: `Audit · Consumer Actions`,
      eyebrow: `Audit`,
      queueLabel: `Consumer event stream`,
      queueIntent: `Recent consumer-triggered actions linked to operational investigations.`,
      mobileChromeMode: `compact`,
      hideSupportingChipsOnTablet: true,
    },
  },
  {
    prefix: `/audit`,
    meta: {
      title: `Audit`,
      eyebrow: `Audit`,
      queueLabel: `Audit event stream`,
      queueIntent: `Immutable event trails for auth and operational actions.`,
      mobileChromeMode: `compact`,
      hideSupportingChipsOnTablet: true,
    },
  },
  {
    prefix: `/exchange/rates`,
    meta: {
      title: `Exchange · Rates`,
      eyebrow: `Exchange`,
      queueLabel: `Tracked rates`,
      queueIntent: `Reference rates and recent operator changes across the exchange workspace.`,
    },
  },
  {
    prefix: `/exchange/rules`,
    meta: {
      title: `Exchange · Rules`,
      eyebrow: `Exchange`,
      queueLabel: `Active rules`,
      queueIntent: `Exchange rules and current operator-owned policy changes.`,
    },
  },
  {
    prefix: `/exchange/scheduled`,
    meta: {
      title: `Exchange · Scheduled`,
      eyebrow: `Exchange`,
      queueLabel: `Scheduled items`,
      queueIntent: `Scheduled exchange jobs and their current operational posture.`,
    },
  },
  {
    prefix: `/exchange`,
    meta: {
      title: `Exchange`,
      eyebrow: `Exchange`,
      queueLabel: `Exchange workspaces`,
      queueIntent: `Rates, rules, and scheduled exchange workflows for operator review.`,
    },
  },
  {
    prefix: `/documents/tags`,
    meta: {
      title: `Documents · Tags`,
      eyebrow: `Documents`,
      queueLabel: `Evidence review`,
      queueIntent: `Document tag review and batch-ready evidence organization.`,
      mobileChromeMode: `compact`,
    },
  },
  {
    prefix: `/documents`,
    meta: {
      title: `Documents`,
      eyebrow: `Documents`,
      queueLabel: `Evidence review`,
      queueIntent: `Evidence explorer for document review, access checks, and tagging workflows.`,
      mobileChromeMode: `compact`,
    },
  },
  {
    prefix: `/payouts`,
    meta: {
      title: `Payouts`,
      eyebrow: `Operations`,
      queueLabel: `Payout review`,
      queueIntent: `Bucketed payout review with escalation context and high-value overlays.`,
      mobileChromeMode: `compact`,
    },
  },
  {
    prefix: `/payment-methods`,
    meta: {
      title: `Payment Methods`,
      eyebrow: `Payment methods`,
      queueLabel: `Method cases`,
      queueIntent: `Payment method cases, status changes, and linked operational investigation paths.`,
    },
  },
  {
    prefix: `/system/alerts`,
    meta: {
      title: `System · Alerts`,
      eyebrow: `PLATFORM`,
      queueLabel: `Open alerts`,
      queueIntent: `Platform alerts, health checks, and delivery risks requiring operator awareness.`,
    },
  },
  {
    prefix: `/system`,
    meta: {
      title: `System`,
      eyebrow: `PLATFORM`,
      queueLabel: `Open alerts`,
      queueIntent: `System health, alerts, and delivery issues requiring operator awareness.`,
    },
  },
  {
    prefix: `/admins`,
    meta: {
      title: `Admins`,
      eyebrow: `PLATFORM`,
      queueLabel: `Admin operations`,
      queueIntent: `Admin access, invitations, roles, and current operational state.`,
    },
  },
  {
    prefix: `/me/sessions`,
    meta: {
      title: `My Sessions`,
      eyebrow: `CASE`,
      queueLabel: `Active sessions`,
      queueIntent: `Current admin session visibility and revocation controls.`,
    },
  },
];

export function getWorkspaceMeta(path: string | null): WorkspaceMeta {
  if (!path) {
    return DEFAULT_WORKSPACE_META;
  }

  for (const entry of WORKSPACE_META_BY_PREFIX) {
    if (path === entry.prefix || path.startsWith(`${entry.prefix}/`)) {
      return entry.meta;
    }
  }

  return DEFAULT_WORKSPACE_META;
}
