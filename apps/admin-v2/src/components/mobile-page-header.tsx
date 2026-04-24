import { type ReactElement } from 'react';

const WORKSPACE_CLASSIFICATION: ReadonlyArray<{
  prefix: string;
  title: string;
  eyebrow: string;
  queueLabel: string;
}> = [
  { prefix: `/overview`, title: `Overview`, eyebrow: `Operations`, queueLabel: `Action ready` },
  { prefix: `/consumers`, title: `Consumers`, eyebrow: `Case review`, queueLabel: `Recent activity` },
  {
    prefix: `/verification`,
    title: `Verification`,
    eyebrow: `Operations`,
    queueLabel: `Action ready`,
  },
  {
    prefix: `/payments/operations`,
    title: `Payments · Operations`,
    eyebrow: `Operations`,
    queueLabel: `Action ready`,
  },
  { prefix: `/payments`, title: `Payments`, eyebrow: `Case review`, queueLabel: `Open cases` },
  {
    prefix: `/ledger/anomalies`,
    title: `Ledger · Anomalies`,
    eyebrow: `Reference`,
    queueLabel: `Anomalies`,
  },
  { prefix: `/ledger`, title: `Ledger and Disputes`, eyebrow: `Case review`, queueLabel: `Open cases` },
  { prefix: `/audit/auth`, title: `Audit · Auth`, eyebrow: `Audit`, queueLabel: `Recent events` },
  {
    prefix: `/audit/admin-actions`,
    title: `Audit · Admin Actions`,
    eyebrow: `Audit`,
    queueLabel: `Recent events`,
  },
  {
    prefix: `/audit/consumer-actions`,
    title: `Audit · Consumer Actions`,
    eyebrow: `Audit`,
    queueLabel: `Recent events`,
  },
  { prefix: `/audit`, title: `Audit`, eyebrow: `Audit`, queueLabel: `Recent events` },
  {
    prefix: `/exchange/rates`,
    title: `Exchange · Rates`,
    eyebrow: `Exchange`,
    queueLabel: `Tracked rates`,
  },
  {
    prefix: `/exchange/rules`,
    title: `Exchange · Rules`,
    eyebrow: `Exchange`,
    queueLabel: `Active rules`,
  },
  {
    prefix: `/exchange/scheduled`,
    title: `Exchange · Scheduled`,
    eyebrow: `Exchange`,
    queueLabel: `Scheduled items`,
  },
  { prefix: `/exchange`, title: `Exchange`, eyebrow: `Exchange`, queueLabel: `Workspaces` },
  {
    prefix: `/documents/tags`,
    title: `Documents · Tags`,
    eyebrow: `Documents`,
    queueLabel: `Pending review`,
  },
  { prefix: `/documents`, title: `Documents`, eyebrow: `Documents`, queueLabel: `Pending review` },
  { prefix: `/payouts`, title: `Payouts`, eyebrow: `Operations`, queueLabel: `Pending` },
  {
    prefix: `/payment-methods`,
    title: `Payment Methods`,
    eyebrow: `Payment methods`,
    queueLabel: `Active`,
  },
  { prefix: `/system/alerts`, title: `System · Alerts`, eyebrow: `PLATFORM`, queueLabel: `Open alerts` },
  { prefix: `/system`, title: `System`, eyebrow: `PLATFORM`, queueLabel: `Open alerts` },
  { prefix: `/admins`, title: `Admins`, eyebrow: `PLATFORM`, queueLabel: `Active sessions` },
  { prefix: `/me/sessions`, title: `My Sessions`, eyebrow: `CASE`, queueLabel: `Active sessions` },
];

function classify(path: string | null): { title: string; eyebrow: string; queueLabel: string } {
  if (!path) return { title: `Console`, eyebrow: `PLATFORM`, queueLabel: `Action ready` };
  for (const entry of WORKSPACE_CLASSIFICATION) {
    if (path === entry.prefix || path.startsWith(`${entry.prefix}/`)) {
      return { title: entry.title, eyebrow: entry.eyebrow, queueLabel: entry.queueLabel };
    }
  }
  return { title: `Console`, eyebrow: `PLATFORM`, queueLabel: `Action ready` };
}

type MobilePageHeaderProps = {
  activePath: string | null;
  liveCount?: number | null;
};

export function MobilePageHeader({ activePath, liveCount = null }: MobilePageHeaderProps): ReactElement {
  const { title, eyebrow, queueLabel } = classify(activePath);
  const countLabel = typeof liveCount === `number` ? String(liveCount) : `—`;
  return (
    <div className="mx-4 mt-2 rounded-card border border-white/8 bg-white/[0.02] px-4 py-3 lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">{eyebrow}</div>
          <div className="mt-1 text-lg font-semibold text-white/95">{title}</div>
        </div>
        <div className="rounded-pill border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100">
          {countLabel}
        </div>
      </div>
      <div className="mt-2 text-xs text-white/52">{queueLabel}</div>
    </div>
  );
}
