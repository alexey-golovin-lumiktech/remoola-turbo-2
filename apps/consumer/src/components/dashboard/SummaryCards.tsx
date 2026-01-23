'use client';

import { type IDashboardSummary } from '../../types';

function formatMoney(cents: number, currency = `USD`) {
  return new Intl.NumberFormat(undefined, {
    style: `currency`,
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

type SummaryCardsProps = { summary: IDashboardSummary };

export function SummaryCards({ summary }: SummaryCardsProps) {
  const lastPaymentLabel = summary.lastPaymentAt
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: `medium`,
        timeStyle: `short`,
      }).format(new Date(summary.lastPaymentAt))
    : `—`;

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl bg-white/90 dark:bg-slate-800/90 px-6 py-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Balance</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{formatMoney(summary.balanceCents)}</p>
      </div>

      <div className="rounded-2xl bg-white/90 dark:bg-slate-800/90 px-6 py-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Contracts</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          {summary.activeRequests} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">active</span>
        </p>
      </div>

      <div className="rounded-2xl bg-white/90 dark:bg-slate-800/90 px-6 py-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Last payment</p>
        <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{lastPaymentLabel}</p>
      </div>
    </section>
  );
}
