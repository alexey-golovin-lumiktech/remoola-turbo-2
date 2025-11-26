'use client';

import { type PendingRequest } from '../../lib/dashboard-api';

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: `currency`,
    currency,
  }).format(amount);
}

export function PendingRequestsTable({ items }: { items: PendingRequest[] }) {
  return (
    <section className="w-full">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Open Payment Requests</h2>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100 bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Amount</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                Last activity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
                  No open payment requests yet.
                </td>
              </tr>
            )}

            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-sm text-slate-900">{item.counterpartyName}</td>
                <td className="px-4 py-3 text-sm text-slate-900">{formatAmount(item.amount, item.currencyCode)}</td>
                <td className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-blue-600">
                  {item.status.replace(/_/g, ` `)}
                </td>
                <td className="px-4 py-3 text-right text-xs text-slate-500">
                  {item.lastActivityAt
                    ? new Intl.DateTimeFormat(undefined, {
                        dateStyle: `medium`,
                      }).format(new Date(item.lastActivityAt))
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
