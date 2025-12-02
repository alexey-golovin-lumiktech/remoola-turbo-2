'use client';

import { type IDashboardSummary } from '../../types';

function formatMoney(cents: number, currency = `USD`) {
  return new Intl.NumberFormat(undefined, {
    style: `currency`,
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function SummaryCards({ summary }: { summary: IDashboardSummary }) {
  const lastPaymentLabel = summary.lastPaymentAt
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: `medium`,
        timeStyle: `short`,
      }).format(new Date(summary.lastPaymentAt))
    : `—`;

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl bg-white/90 px-6 py-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Balance</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{formatMoney(summary.balanceCents)}</p>
      </div>

      <div className="rounded-2xl bg-white/90 px-6 py-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Contracts</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">
          {summary.activeRequests} <span className="text-sm font-normal text-slate-500">active</span>
        </p>
      </div>

      <div className="rounded-2xl bg-white/90 px-6 py-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last payment</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">{lastPaymentLabel}</p>
      </div>
    </section>
  );
}
