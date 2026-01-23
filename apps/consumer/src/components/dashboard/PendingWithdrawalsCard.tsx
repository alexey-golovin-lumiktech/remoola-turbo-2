'use client';

import { useEffect, useState } from 'react';

import { PaymentDirection, TransactionStatus } from '@remoola/api-types';

type Transaction = {
  id: string;
  code: string;
  amount: string;
  status: string;
  createdAt: string | null;
};

type HistoryResponse = { items: Transaction[]; total: number };

export function PendingWithdrawalsCard() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const search = new URLSearchParams({
          direction: PaymentDirection.OUTCOME,
          status: TransactionStatus.PENDING,
          limit: `5`,
        });
        const res = await fetch(`/api/payments/history?${search.toString()}`, { credentials: `include` });
        if (!res.ok) return;
        const json = (await res.json()) as HistoryResponse;
        setData(json);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Pending withdrawals</h3>
        {data && data.total > 0 && <span className="text-xs text-gray-500 dark:text-gray-400">{data.total} total</span>}
      </div>

      {loading && <p className="text-xs text-gray-500 dark:text-gray-400">Loading…</p>}

      {!loading && (!data || data.items.length === 0) && (
        <p className="text-xs text-gray-500 dark:text-gray-400">No pending withdrawals.</p>
      )}

      {!loading && data && data.items.length > 0 && (
        <ul className="space-y-2 text-xs">
          {data.items.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-700 px-3 py-2"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-white">-${Number(tx.amount).toFixed(2)}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Code {tx.code}</div>
              </div>
              <span className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 px-2 py-0.5 text-[11px] font-medium text-yellow-800 dark:text-yellow-300">
                Pending
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
