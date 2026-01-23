'use client';

import { type IPendingRequest } from '../../types';

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: `currency`,
    currency,
  }).format(amount);
}

type PendingRequestsTableProps = { pendingRequests: IPendingRequest[] };

export function PendingRequestsTable({ pendingRequests }: PendingRequestsTableProps) {
  return (
    <section className="w-full">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Open Payment Requests</h2>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100 bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Last activity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pendingRequests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                  No open payment requests yet.
                </td>
              </tr>
            )}

            {pendingRequests.map((pendingRequest) => (
              <tr key={pendingRequest.id}>
                <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{pendingRequest.counterpartyName}</td>
                <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                  {formatAmount(pendingRequest.amount, pendingRequest.currencyCode)}
                </td>
                <td className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  {pendingRequest.status.replace(/_/g, ` `)}
                </td>
                <td className="px-4 py-3 text-right text-xs text-slate-500 dark:text-slate-400">
                  {pendingRequest.lastActivityAt
                    ? new Intl.DateTimeFormat(undefined, {
                        dateStyle: `medium`,
                      }).format(new Date(pendingRequest.lastActivityAt))
                    : `—`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
